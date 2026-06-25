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
const SETTLE_EPS    = 0.02   // mean per-node velocity² considered "at rest"
const SETTLE_FRAMES = 45     // calm frames required before freezing

export function useSimulation() {
  // { calm: consecutive calm frames, sig: last structural signature }
  const settle = useRef({ calm: 0, sig: '' })

  useFrame(() => {
    const { nodes, edges, currentLayout } = useGraphStore.getState()
    if (nodes.length === 0) return

    // Re-heat whenever the graph structure changes.
    const sig = `${nodes.length}:${edges.length}:${currentLayout}`
    if (sig !== settle.current.sig) {
      settle.current.sig = sig
      settle.current.calm = 0
    }
    // Frozen: graph is at rest — skip the whole tick (no compute, no setState).
    if (settle.current.calm > SETTLE_FRAMES) return

    const layout = getLayout(currentLayout)
    const { repulsion, attraction, damping } = { ...DEFAULTS, ...layout.physics }

    const fx = new Float64Array(nodes.length)
    const fy = new Float64Array(nodes.length)
    const fz = new Float64Array(nodes.length)

    // ── Repulsion: every pair pushes away from each other ──────────────────
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const ni = nodes[i], nj = nodes[j]
        const dx = ni.x - nj.x
        const dy = ni.y - nj.y
        const dz = ni.z - nj.z
        let dist2 = dx * dx + dy * dy + dz * dz
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
    const idToIdx = {}
    nodes.forEach((n, i) => { idToIdx[n.id] = i })

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

    // ── Spouse attraction: pull husband-wife pairs much closer together ─────
    const SPOUSE_K = 0.05
    for (const edge of edges) {
      const rel = (edge.relType ?? '').toUpperCase()
      if (!rel.includes('SPOUSE') && !rel.includes('PARTNER') && !rel.includes('MARRIAGE')) continue
      const i = idToIdx[edge.sourceId]
      const j = idToIdx[edge.targetId]
      if (i === undefined || j === undefined) continue
      const ni = nodes[i], nj = nodes[j]
      const dx = nj.x - ni.x
      const dy = nj.y - ni.y
      const dz = nj.z - ni.z
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1
      const mag  = SPOUSE_K * dist
      fx[i] += (dx / dist) * mag;  fy[i] += (dy / dist) * mag;  fz[i] += (dz / dist) * mag
      fx[j] -= (dx / dist) * mag;  fy[j] -= (dy / dist) * mag;  fz[j] -= (dz / dist) * mag
    }

    // ── Angular grouping (cone layout only) ────────────────────────────────
    // Connected nodes nudge each other's XZ angle so relatives cluster on
    // the same side of their ring.  Y and radius stay locked — only the
    // tangential component of force is meaningful here.
    if (currentLayout === 'cone') {
      const ANGULAR_K = 0.055   // direct-edge angular attraction strength
      const SIBLING_K = 0.020   // shared-parent sibling attraction (weaker)

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
    let energy = 0
    const updated = nodes.map((n, i) => {
      let vx = (n.vx + fx[i]) * damping
      let vy = (n.vy + fy[i]) * damping
      let vz = (n.vz + fz[i]) * damping

      const nx = n.x + vx
      const ny = n.y + vy
      const nz = n.z + vz

      // Delegate position + velocity clamping to the active layout
      const constrained = layout.constrain(nx, ny, nz, vx, vy, vz, n)
      const cvx = constrained.vx ?? vx
      const cvy = constrained.vy ?? vy
      const cvz = constrained.vz ?? vz
      energy += cvx * cvx + cvy * cvy + cvz * cvz
      return { ...n, ...constrained }
    })

    // Track settling: increment the calm counter while the graph is near-still,
    // reset the moment it picks up motion again.
    if (energy / nodes.length < SETTLE_EPS) settle.current.calm++
    else settle.current.calm = 0

    useGraphStore.setState({ nodes: updated })
  })
}
