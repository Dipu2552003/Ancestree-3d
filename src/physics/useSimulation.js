import { useFrame } from '@react-three/fiber'
import useGraphStore from '../store/useGraphStore'

// Physics model: each node is constrained to its generation sphere shell.
// Nodes can move freely in all 3 directions but are always snapped back to their
// shell radius. Forces:
//   • Repulsion  — every pair pushes apart (spreads nodes around the shell)
//   • Attraction — edge-connected nodes pull toward each other like a string,
//                  drawing them to the same region of their respective shells
//
// The string analogy: a parent and child on adjacent shells are connected by
// a string. The string pulls the parent's angular direction toward the child's
// and vice versa, so connected clusters converge to the same "side" of the sphere.

const REPULSION  = 14000   // how strongly nodes on the same shell spread apart
const ATTRACTION = 0.0002  // string pull — proportional to 3D distance, always attractive
const DAMPING    = 0.88    // velocity bleed per frame (< 1 → system settles)

export function useSimulation() {
  useFrame(() => {
    const { nodes, edges } = useGraphStore.getState()
    if (nodes.length === 0) return

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
        const mag  = REPULSION / dist2
        const ux = dx / dist, uy = dy / dist, uz = dz / dist
        fx[i] += ux * mag;  fy[i] += uy * mag;  fz[i] += uz * mag
        fx[j] -= ux * mag;  fy[j] -= uy * mag;  fz[j] -= uz * mag
      }
    }

    // ── Attraction: string pull along every edge ────────────────────────────
    // Force magnitude ∝ 3D distance so longer strings pull harder.
    // This naturally groups connected nodes into the same angular region even
    // when they live on different shells.
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
      const mag  = ATTRACTION * dist  // pure attraction — no rest length
      fx[i] += (dx / dist) * mag;  fy[i] += (dy / dist) * mag;  fz[i] += (dz / dist) * mag
      fx[j] -= (dx / dist) * mag;  fy[j] -= (dy / dist) * mag;  fz[j] -= (dz / dist) * mag
    }

    // ── Integrate + clamp to sphere shell ──────────────────────────────────
    const updated = nodes.map((n, i) => {
      let vx = (n.vx + fx[i]) * DAMPING
      let vy = (n.vy + fy[i]) * DAMPING
      let vz = (n.vz + fz[i]) * DAMPING

      let x = n.x + vx
      let y = n.y + vy
      let z = n.z + vz

      // Snap back onto the generation sphere shell
      const len   = Math.sqrt(x * x + y * y + z * z) || 1
      const scale = n.orbitRadius / len
      x *= scale;  y *= scale;  z *= scale

      // Cancel the outward radial velocity — nodes slide on the sphere surface,
      // they don't drill through it. Only tangential velocity is kept.
      const rx = x / n.orbitRadius
      const ry = y / n.orbitRadius
      const rz = z / n.orbitRadius
      const radial = vx * rx + vy * ry + vz * rz
      vx -= radial * rx
      vy -= radial * ry
      vz -= radial * rz

      return { ...n, x, y, z, vx, vy, vz }
    })

    useGraphStore.setState({ nodes: updated })
  })
}
