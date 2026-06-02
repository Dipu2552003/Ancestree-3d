// ── ForceLayout.js ────────────────────────────────────────────────────────────
// Unconstrained force-directed layout.
// Nodes float freely in 3D space with only a soft outer boundary sphere at r=550
// to keep the graph from flying apart forever.

function randomInSphere(r) {
  // Random point inside a sphere biased toward the surface at radius r
  const u     = Math.random() * 2 - 1
  const theta = Math.random() * Math.PI * 2
  const s     = Math.sqrt(1 - u * u)
  // Start them near their orbital radius (same as sphere layout start)
  return {
    x: r * s * Math.cos(theta),
    y: r * s * Math.sin(theta),
    z: r * u,
  }
}

const OUTER_BOUNDARY = 550

const ForceLayout = {
  id: 'force',
  label: 'Force',
  icon: '✦',

  getInitialPosition(node) {
    return randomInSphere(node.orbitRadius)
  },

  constrain(x, y, z, vx, vy, vz) {
    const dist = Math.sqrt(x * x + y * y + z * z)
    if (dist > OUTER_BOUNDARY) {
      const scale = OUTER_BOUNDARY / dist
      return {
        x: x * scale,
        y: y * scale,
        z: z * scale,
        vx: vx * 0.6,
        vy: vy * 0.6,
        vz: vz * 0.6,
      }
    }
    return { x, y, z, vx, vy, vz }
  },

  physics: { repulsion: 20000, attraction: 0.0004, damping: 0.92 },
}

export default ForceLayout
