// ── useSimulation.js ──────────────────────────────────────────────────────────
// Physics model: nodes repel each other and are attracted along edges.
// The active layout's constrain() function determines how each node is snapped
// back to its target surface after integration.
//
// Forces:
//   • Repulsion  — every pair pushes apart
//   • Attraction — edge-connected nodes pull toward each other (string analogy)
//   • Layout constraint — applied after integration (sphere snap, cone rings, etc.)

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import useGraphStore from '../store/useGraphStore'
import { getLayout } from '../layouts'

// Fallback physics constants (overridden per-layout via layout.physics)
const DEFAULTS = { repulsion: 14000, attraction: 0.0002, damping: 0.88 }

// ── Freeze-on-settle ──────────────────────────────────────────────────────────
// A family graph is static — once nodes stop moving there is nothing to compute.
// We measure mean kinetic energy each tick; after the graph stays below
// SETTLE_EPS for SETTLE_FRAMES consecutive frames we stop running the (O(n²))
// simulation and stop writing to the store, so React goes fully idle. Any
// structural change (add/remove node, edge change, layout switch) re-heats it.
const SETTLE_EPS    = 0.05   // mean per-node velocity² considered "at rest"
const SETTLE_FRAMES = 28     // calm frames required before freezing

// ── Cooling (alpha) ───────────────────────────────────────────────────────────
// All forces are scaled by a global `alpha` that decays toward 0 every tick
// (d3-force style). Without this, the cone's angular grouping can settle into a
// limit cycle and keep slowly revolving forever; cooling guarantees the graph
// always comes to a full stop. We also actively cancel net ring rotation each
// tick (see "Kill net ring spin" below), so the revolve dies fast rather than
// coasting through a long cool-down. Alpha resets to 1 on any structural change.
const ALPHA_DECAY = 0.05     // per-frame cooling rate (~1.7s to fully cool)
const ALPHA_MIN   = 0.01     // below this, alpha snaps to 0 (forces off)

// Repulsion beyond this distance is negligible (force ∝ 1/d²); skipping the
// sqrt/division for far-apart pairs keeps each O(n²) tick cheap on big graphs.
const REPULSION_CUTOFF2 = 1400 * 1400

export function useSimulation() {
  // { calm: consecutive calm frames, sig: last structural signature, alpha: cooling }
  const settle = useRef({ calm: 0, sig: '', alpha: 1 })

  useFrame(() => {
    const { nodes, edges, currentLayout } = useGraphStore.getState()
    if (nodes.length === 0) return

    // Re-heat whenever the graph structure changes.
    const sig = `${nodes.length}:${edges.length}:${currentLayout}`
    if (sig !== settle.current.sig) {
      settle.current.sig = sig
      settle.current.calm = 0
      settle.current.alpha = 1
    }
    // Frozen: graph is at rest — skip the whole tick (no compute, no setState).
    if (settle.current.calm > SETTLE_FRAMES) return

    const alpha = settle.current.alpha

    const layout = getLayout(currentLayout)
    const { repulsion, attraction, damping } = { ...DEFAULTS, ...layout.physics }

    const fx = new Float64Array(nodes.length)
    const fy = new Float64Array(nodes.length)
    const fz = new Float64Array(nodes.length)

    const idToIdx = {}
    nodes.forEach((n, i) => { idToIdx[n.id] = i })

    // ── Couple pairs ────────────────────────────────────────────────────────
    // A married couple is a rigid unit (highest-priority rule): we exclude the
    // pair from mutual repulsion here and bind them with a short, strong spring
    // below. The result is husband & wife always sit adjacent with a small gap,
    // and — because nothing pushes them apart — no one is placed between them.
    const couplePairs = []
    const isCouple    = new Set()   // "i|j" key with i < j
    for (const edge of edges) {
      const rel = (edge.relType ?? '').toUpperCase()
      if (!rel.includes('SPOUSE') && !rel.includes('PARTNER') && !rel.includes('MARRIAGE')) continue
      const i = idToIdx[edge.sourceId]
      const j = idToIdx[edge.targetId]
      if (i === undefined || j === undefined) continue
      const a = Math.min(i, j), b = Math.max(i, j)
      const key = `${a}|${b}`
      if (!isCouple.has(key)) { isCouple.add(key); couplePairs.push([a, b]) }
    }

    // ── Repulsion: every pair pushes away — except couples (kept together) ──
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        if (isCouple.has(`${i}|${j}`)) continue
        const ni = nodes[i], nj = nodes[j]
        const dx = ni.x - nj.x
        const dy = ni.y - nj.y
        const dz = ni.z - nj.z
        let dist2 = dx * dx + dy * dy + dz * dz
        if (dist2 > REPULSION_CUTOFF2) continue   // too far to matter — skip the math
        if (dist2 < 1) dist2 = 1
        const dist = Math.sqrt(dist2)
        const mag  = repulsion / dist2
        const ux = dx / dist, uy = dy / dist, uz = dz / dist
        fx[i] += ux * mag;  fy[i] += uy * mag;  fz[i] += uz * mag
        fx[j] -= ux * mag;  fy[j] -= uy * mag;  fz[j] -= uz * mag
      }
    }

    // ── Attraction: string pull along every edge ────────────────────────────
    // Force magnitude ∝ 3D distance so longer strings pull harder.
    for (const edge of edges) {
      const i = idToIdx[edge.sourceId]
      const j = idToIdx[edge.targetId]
      if (i === undefined || j === undefined) continue
      const ni = nodes[i], nj = nodes[j]
      const dx = nj.x - ni.x
      const dy = nj.y - ni.y
      const dz = nj.z - ni.z
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1
      const mag  = attraction * dist  // pure attraction — no rest length
      fx[i] += (dx / dist) * mag;  fy[i] += (dy / dist) * mag;  fz[i] += (dz / dist) * mag
      fx[j] -= (dx / dist) * mag;  fy[j] -= (dy / dist) * mag;  fz[j] -= (dz / dist) * mag
    }

    // ── Couple bond: short strong spring so husband & wife lock adjacent ─────
    // Spring toward a small rest gap (not toward 0). With mutual repulsion
    // removed above, this alone sets the couple's separation; external forces
    // act on both members almost equally, so the pair moves — and stays —
    // together. COUPLE_GAP is the tunable "smallest horizontal gap" knob.
    const COUPLE_GAP = 50    // target centre-to-centre distance (~half a normal slot)
    const COUPLE_K   = 0.08  // spring strength toward COUPLE_GAP
    for (const [i, j] of couplePairs) {
      const ni = nodes[i], nj = nodes[j]
      const dx = nj.x - ni.x
      const dy = nj.y - ni.y
      const dz = nj.z - ni.z
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1
      const ux = dx / dist, uy = dy / dist, uz = dz / dist
      const mag = COUPLE_K * (dist - COUPLE_GAP)   // >0 pull in, <0 push apart to gap
      fx[i] += ux * mag;  fy[i] += uy * mag;  fz[i] += uz * mag
      fx[j] -= ux * mag;  fy[j] -= uy * mag;  fz[j] -= uz * mag
    }

    // ── Angular grouping (cone layout only) ────────────────────────────────
    // Connected nodes nudge each other's XZ angle so relatives cluster on
    // the same side of their ring.  Y and radius stay locked — only the
    // tangential component of force is meaningful here.
    if (currentLayout === 'cone') {
      const ANGULAR_K = 0.055   // direct-edge angular attraction strength
      // Sibling cohesion must be strong enough to resist each parent being
      // pulled toward its own children (which otherwise splits a sibling group
      // when siblings have kids at different angles). Repulsion still prevents
      // them from collapsing onto each other.
      const SIBLING_K = 0.045   // shared-parent sibling attraction

      // Smallest signed angle difference, wrapped to (−π, π]
      function wrapDelta(d) {
        while (d >  Math.PI) d -= 2 * Math.PI
        while (d < -Math.PI) d += 2 * Math.PI
        return d
      }

      // Precompute each node's current XZ angle
      const nodeAngle = nodes.map(n => Math.atan2(n.z, n.x))

      // Apply a tangential impulse to node i (pushes it around its ring by delta)
      function pushAngle(i, delta, strength) {
        const n = nodes[i]
        const xzLen = Math.sqrt(n.x * n.x + n.z * n.z) || 1
        const tx = -n.z / xzLen   // unit tangent (+θ direction)
        const tz =  n.x / xzLen
        const mag = strength * delta
        fx[i] += tx * mag
        fz[i] += tz * mag
      }

      // Build undirected adjacency list (all edge types)
      const adj = {}
      for (const n of nodes) adj[n.id] = []
      for (const e of edges) {
        adj[e.sourceId]?.push(e.targetId)
        adj[e.targetId]?.push(e.sourceId)
      }

      // Phase A — pull each node toward the circular mean of its neighbours
      // Uses atan2(Σsin, Σcos) to correctly handle angle wrapping.
      for (let i = 0; i < nodes.length; i++) {
        const nbs = adj[nodes[i].id] ?? []
        if (nbs.length === 0) continue

        let sinSum = 0, cosSum = 0, count = 0
        for (const nbId of nbs) {
          const j = idToIdx[nbId]
          if (j === undefined) continue
          sinSum += Math.sin(nodeAngle[j])
          cosSum += Math.cos(nodeAngle[j])
          count++
        }
        if (count === 0 || (sinSum === 0 && cosSum === 0)) continue

        const target = Math.atan2(sinSum, cosSum)
        pushAngle(i, wrapDelta(target - nodeAngle[i]), ANGULAR_K)
      }

      // Phase B — sibling grouping via shared PARENT_OF parent
      // For each parent P, attract all pairs of P's direct children toward
      // each other angularly so siblings cluster on the same ring segment.
      const childrenOf = {}
      for (const e of edges) {
        const rel = (e.relType ?? '').toUpperCase()
        if (rel !== 'PARENT_OF') continue
        if (!childrenOf[e.sourceId]) childrenOf[e.sourceId] = []
        childrenOf[e.sourceId].push(e.targetId)
      }

      for (const childIds of Object.values(childrenOf)) {
        const childIdx = childIds.map(id => idToIdx[id]).filter(j => j !== undefined)
        for (let a = 0; a < childIdx.length - 1; a++) {
          for (let b = a + 1; b < childIdx.length; b++) {
            const i = childIdx[a], j = childIdx[b]
            const delta = wrapDelta(nodeAngle[j] - nodeAngle[i])
            pushAngle(i,  delta, SIBLING_K)
            pushAngle(j, -delta, SIBLING_K)
          }
        }
      }
    }

    // ── Sphere sibling grouping ────────────────────────────────────────────
    // Same concept as cone Phase B but works in 3D: siblings are pulled toward
    // each other along the sphere surface (tangential force, no radial change).
    if (currentLayout === 'sphere') {
      const SPHERE_SIBLING_K = 0.018

      const childrenOf = {}
      for (const e of edges) {
        if ((e.relType ?? '').toUpperCase() !== 'PARENT_OF') continue
        if (!childrenOf[e.sourceId]) childrenOf[e.sourceId] = []
        childrenOf[e.sourceId].push(e.targetId)
      }

      for (const childIds of Object.values(childrenOf)) {
        const childIdx = childIds.map(id => idToIdx[id]).filter(j => j !== undefined)
        for (let a = 0; a < childIdx.length - 1; a++) {
          for (let b = a + 1; b < childIdx.length; b++) {
            const i = childIdx[a], j = childIdx[b]
            const ni = nodes[i], nj = nodes[j]

            // 3D direction from i toward j
            const dx = nj.x - ni.x, dy = nj.y - ni.y, dz = nj.z - ni.z
            const dlen = Math.sqrt(dx*dx + dy*dy + dz*dz) || 1

            // Project onto ni's tangent plane (remove radial component)
            const ri = ni.orbitRadius || 1
            const rx = ni.x/ri, ry = ni.y/ri, rz = ni.z/ri
            const dot = (dx/dlen)*rx + (dy/dlen)*ry + (dz/dlen)*rz
            const tx = dx/dlen - dot*rx
            const ty = dy/dlen - dot*ry
            const tz = dz/dlen - dot*rz
            const tlen = Math.sqrt(tx*tx + ty*ty + tz*tz) || 1

            fx[i] += (tx/tlen) * SPHERE_SIBLING_K
            fy[i] += (ty/tlen) * SPHERE_SIBLING_K
            fz[i] += (tz/tlen) * SPHERE_SIBLING_K

            // Symmetric force: j toward i
            const rj = nj.orbitRadius || 1
            const rx2 = nj.x/rj, ry2 = nj.y/rj, rz2 = nj.z/rj
            const dot2 = (-dx/dlen)*rx2 + (-dy/dlen)*ry2 + (-dz/dlen)*rz2
            const tx2 = -dx/dlen - dot2*rx2
            const ty2 = -dy/dlen - dot2*ry2
            const tz2 = -dz/dlen - dot2*rz2
            const tlen2 = Math.sqrt(tx2*tx2 + ty2*ty2 + tz2*tz2) || 1

            fx[j] += (tx2/tlen2) * SPHERE_SIBLING_K
            fy[j] += (ty2/tlen2) * SPHERE_SIBLING_K
            fz[j] += (tz2/tlen2) * SPHERE_SIBLING_K
          }
        }
      }
    }

    // ── Integrate + layout constraint ──────────────────────────────────────
    // Forces are scaled by the cooling factor so motion always winds down.
    const updated = nodes.map((n, i) => {
      const vx0 = (n.vx + fx[i] * alpha) * damping
      const vy0 = (n.vy + fy[i] * alpha) * damping
      const vz0 = (n.vz + fz[i] * alpha) * damping

      // Delegate position + velocity clamping to the active layout
      const constrained = layout.constrain(n.x + vx0, n.y + vy0, n.z + vz0, vx0, vy0, vz0, n)
      return {
        ...n,
        ...constrained,
        vx: constrained.vx ?? vx0,
        vy: constrained.vy ?? vy0,
        vz: constrained.vz ?? vz0,
      }
    })

    // ── Kill net ring spin (cone) ──────────────────────────────────────────
    // The angular grouping forces can settle into a slow solid-body rotation —
    // the whole ring revolving forever (the "nodes keep circling" bug). Each
    // tick we measure the average angular velocity of every ring and subtract
    // it, so genuine local rearrangement still happens but the ring as a whole
    // has no momentum to coast on. This makes the graph come to rest quickly
    // instead of spinning down slowly over the cool-down.
    if (currentLayout === 'cone') {
      const sumOmega = new Map()   // generation → Σ angular velocity
      const ringCnt  = new Map()   // generation → node count
      for (const n of updated) {
        const r = Math.sqrt(n.x * n.x + n.z * n.z)
        if (r < 1) continue
        const omega = (n.vx * (-n.z) + n.vz * n.x) / (r * r)   // dθ/dt about Y
        const g = n.generation ?? 0
        sumOmega.set(g, (sumOmega.get(g) ?? 0) + omega)
        ringCnt.set(g, (ringCnt.get(g) ?? 0) + 1)
      }
      for (const n of updated) {
        const g = n.generation ?? 0
        const cnt = ringCnt.get(g) ?? 0
        if (cnt < 2) continue
        const meanOmega = sumOmega.get(g) / cnt
        // Remove the solid-body rotation component: v_tangential -= meanω · r · t̂
        n.vx -= meanOmega * (-n.z)
        n.vz -= meanOmega * n.x
      }
    }

    // Total kinetic energy after the spin correction — drives settle detection.
    let energy = 0
    for (const n of updated) energy += n.vx * n.vx + n.vy * n.vy + n.vz * n.vz

    // Cool down: decay alpha toward 0 so forces fade and the graph stops.
    settle.current.alpha = alpha < ALPHA_MIN ? 0 : alpha * (1 - ALPHA_DECAY)

    // Track settling: increment the calm counter while the graph is near-still,
    // reset the moment it picks up motion again.
    if (energy / nodes.length < SETTLE_EPS) settle.current.calm++
    else settle.current.calm = 0

    useGraphStore.setState({ nodes: updated })
  })
}
