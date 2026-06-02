// ── TreeLayout.js ─────────────────────────────────────────────────────────────
// Flat horizontal layers by generation.
// Y position is fixed per generation; X and Z spread freely via physics forces.

// Key: orbitRadius (same as SphereLayout radii). Value: Y position.
export const TREE_Y = {
  80:  350,   // great-grandparents — topmost row
  160: 220,   // grandparents
  240: 100,   // parents
  320: 0,     // self / own generation
  400: -100,  // children
  480: -220,  // grandchildren
}

const XZ_CLAMP = 400

const TreeLayout = {
  id: 'tree',
  label: 'Tree',
  icon: '⋮',

  getInitialPosition(node) {
    const y = TREE_Y[node.orbitRadius] ?? 0
    // Spread randomly in XZ plane at the correct Y level
    const x = (Math.random() * 2 - 1) * 200
    const z = (Math.random() * 2 - 1) * 200
    return { x, y, z }
  },

  constrain(x, y, z, vx, vy, vz, node) {
    // Fix y to generation row
    const ny  = TREE_Y[node.orbitRadius] ?? 0
    const nvy = 0

    // Clamp x and z to ±400
    const nx  = Math.max(-XZ_CLAMP, Math.min(XZ_CLAMP, x))
    const nz  = Math.max(-XZ_CLAMP, Math.min(XZ_CLAMP, z))

    // Dampen velocity at edges
    const nvx = (nx === x) ? vx : vx * 0.5
    const nvz = (nz === z) ? vz : vz * 0.5

    return { x: nx, y: ny, z: nz, vx: nvx, vy: nvy, vz: nvz }
  },

  physics: { repulsion: 18000, attraction: 0.0001, damping: 0.90 },
}

export default TreeLayout
