import { useFrame } from '@react-three/fiber'
import useGraphStore from '../store/useGraphStore'

const REPULSION   = 6000
const ATTRACTION  = 0.0004
const REST_LENGTH = 100
const DAMPING     = 0.88

export function useSimulation() {
  useFrame(() => {
    const { nodes, edges } = useGraphStore.getState()
    if (nodes.length === 0) return

    // accumulate forces into local arrays so we do one bulk update
    const fx = new Float64Array(nodes.length)
    const fy = new Float64Array(nodes.length)
    const fz = new Float64Array(nodes.length)

    // repulsion between every pair
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const ni = nodes[i], nj = nodes[j]
        let dx = ni.x - nj.x
        let dy = ni.y - nj.y
        let dz = ni.z - nj.z
        let dist2 = dx * dx + dy * dy + dz * dz
        if (dist2 < 1) dist2 = 1
        const dist = Math.sqrt(dist2)
        const mag = REPULSION / dist2
        const ux = dx / dist, uy = dy / dist, uz = dz / dist
        fx[i] += ux * mag;  fy[i] += uy * mag;  fz[i] += uz * mag
        fx[j] -= ux * mag;  fy[j] -= uy * mag;  fz[j] -= uz * mag
      }
    }

    // attraction along edges
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
      const stretch = dist - REST_LENGTH
      const mag = ATTRACTION * stretch
      fx[i] += dx / dist * mag;  fy[i] += dy / dist * mag;  fz[i] += dz / dist * mag
      fx[j] -= dx / dist * mag;  fy[j] -= dy / dist * mag;  fz[j] -= dz / dist * mag
    }

    // integrate, clamp to orbit sphere, zero radial velocity
    const updated = nodes.map((n, i) => {
      let vx = (n.vx + fx[i]) * DAMPING
      let vy = (n.vy + fy[i]) * DAMPING
      let vz = (n.vz + fz[i]) * DAMPING

      let x = n.x + vx
      let y = n.y + vy
      let z = n.z + vz

      // clamp back to orbit sphere
      const len = Math.sqrt(x * x + y * y + z * z) || 1
      const scale = n.orbitRadius / len
      x *= scale
      y *= scale
      z *= scale

      // cancel radial velocity component
      const rx = x / n.orbitRadius, ry = y / n.orbitRadius, rz = z / n.orbitRadius
      const radial = vx * rx + vy * ry + vz * rz
      vx -= radial * rx
      vy -= radial * ry
      vz -= radial * rz

      return { ...n, x, y, z, vx, vy, vz }
    })

    useGraphStore.setState({ nodes: updated })
  })
}
