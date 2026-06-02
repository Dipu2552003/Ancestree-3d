// ── HelixLayout.js ────────────────────────────────────────────────────────────
// Nodes are constrained to a cylindrical surface, stacked in rings by generation.
// The visual appears as rings at different heights forming a coil / helix structure.

export const HELIX_RADIUS = 150
export const HELIX_PITCH  = 100  // y-distance between adjacent generation rings

// Key: orbitRadius. Value: generation multiplier used to compute y = gen * HELIX_PITCH.
export const HELIX_GENS = {
  80:  -2.5,   // great-grandparents — highest ring
  160: -1.5,   // grandparents
  240: -0.8,   // parents
  320:  0,     // self
  400:  0.8,   // children
  480:  1.5,   // grandchildren
}

const HelixLayout = {
  id: 'helix',
  label: 'Helix',
  icon: '∿',

  getInitialPosition(node) {
    const gen   = HELIX_GENS[node.orbitRadius] ?? 0
    const yPos  = gen * HELIX_PITCH
    // Place at angle based on generation + small random offset so nodes
    // don't all start at exactly the same angle on a ring
    const angle = gen * (Math.PI / 2) + (Math.random() - 0.5) * 0.8
    return {
      x: HELIX_RADIUS * Math.cos(angle),
      y: yPos,
      z: HELIX_RADIUS * Math.sin(angle),
    }
  },

  constrain(x, y, z, vx, vy, vz, node) {
    const gen  = HELIX_GENS[node.orbitRadius] ?? 0
    const ny   = gen * HELIX_PITCH
    const nvy  = 0

    // Constrain xz to HELIX_RADIUS circle
    const xzDist = Math.sqrt(x * x + z * z) || 1
    const scale  = HELIX_RADIUS / xzDist
    const nx = x * scale
    const nz = z * scale

    // Cancel radial xz velocity (keep only tangential)
    const rx = nx / HELIX_RADIUS
    const rz = nz / HELIX_RADIUS
    const radialXZ = vx * rx + vz * rz
    const nvx = vx - radialXZ * rx
    const nvz = vz - radialXZ * rz

    return { x: nx, y: ny, z: nz, vx: nvx, vy: nvy, vz: nvz }
  },

  physics: { repulsion: 12000, attraction: 0.0003, damping: 0.89 },
}

export default HelixLayout
