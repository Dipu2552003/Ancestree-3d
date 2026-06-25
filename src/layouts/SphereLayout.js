// ── SphereLayout.js ───────────────────────────────────────────────────────────
// Nodes are constrained to concentric sphere shells, one per generation.
// Shell radii are now much larger so adjacent generations have clear visual space.

// ── Constants ────────────────────────────────────────────────────────────────
export const SPHERE_SELF_RADIUS = 550   // radius of generation-0 (self) shell
export const SPHERE_STEP        = 150   // gap between adjacent shells

// generation → shell radius (legacy fixed sizing; used as a fallback)
// Ancestors (positive gen in 3D convention) → inner shells (smaller r)
// Descendants (negative gen)               → outer shells (larger r)
export function sphereShellRadius(gen) {
  return Math.max(80, SPHERE_SELF_RADIUS - gen * SPHERE_STEP)
}

// ── Population-aware shell sizing ────────────────────────────────────────────
// Mirrors the cone's population-aware rings: each shell is sized so its nodes
// keep roughly the same nearest-neighbour spacing the cone uses (~100 units),
// instead of being crammed onto a fixed-radius sphere. For an even spread the
// nearest-neighbour distance d ≈ 4r/√count, so r = d·√count/4. Sparse shells
// clamp to a floor; adjacent shells are kept a minimum radial gap apart so
// generations stay visually separated (the old fixed step merged them into one
// dense ball).
export const SPHERE_NODE_SPACING = 120   // target nearest-neighbour distance on a shell
export const SPHERE_MIN_RADIUS   = 300   // floor radius for sparse shells
export const SPHERE_SHELL_GAP    = 200   // minimum radial separation between shells

export function sphereRadiusForCount(count) {
  return Math.max(
    SPHERE_MIN_RADIUS,
    (SPHERE_NODE_SPACING * Math.sqrt(Math.max(1, count))) / 4,
  )
}

// Build a gen → shell-radius map that is both population-aware and ordered:
// process innermost (highest gen / ancestors) outward, never letting a shell
// be closer than SPHERE_SHELL_GAP to the one inside it. This guarantees shells
// never cross even when an inner generation is densely populated.
export function sphereRadiiByGen(counts) {
  const gens  = [...counts.keys()].sort((a, b) => b - a)  // innermost (high gen) first
  const radii = new Map()
  let running = 0
  for (const g of gens) {
    const want = sphereRadiusForCount(counts.get(g) ?? 1)
    const r    = Math.max(want, running + SPHERE_SHELL_GAP)
    radii.set(g, r)
    running = r
  }
  return radii
}

// Shell labels for LayoutGuides
export const SHELL_RADII = [
  sphereShellRadius(3),   // 100  — great-grandparents
  sphereShellRadius(2),   // 250  — grandparents
  sphereShellRadius(1),   // 400  — parents
  sphereShellRadius(0),   // 550  — self
  sphereShellRadius(-1),  // 700  — children
  sphereShellRadius(-2),  // 850  — grandchildren
]
export const SHELL_LABELS = [
  'Great-grandparents',
  'Grandparents',
  'Parents',
  'You',
  'Children',
  'Grandchildren',
]

// ── Backward-compat radius lookup (string-based fallback) ────────────────────
const GENERATION_RADIUS = {
  'great-grandfather': sphereShellRadius(3), 'great-grandmother': sphereShellRadius(3),
  'great grandfather': sphereShellRadius(3), 'great grandmother': sphereShellRadius(3),
  'grandfather': sphereShellRadius(2), 'grandmother': sphereShellRadius(2),
  'grandpa': sphereShellRadius(2), 'grandma': sphereShellRadius(2),
  'nana': sphereShellRadius(2), 'nani': sphereShellRadius(2),
  'dada': sphereShellRadius(2), 'dadi': sphereShellRadius(2),
  'great-uncle': sphereShellRadius(2), 'great-aunt': sphereShellRadius(2),
  'father': sphereShellRadius(1), 'mother': sphereShellRadius(1),
  'dad': sphereShellRadius(1), 'mom': sphereShellRadius(1),
  'papa': sphereShellRadius(1), 'mama': sphereShellRadius(1),
  'uncle': sphereShellRadius(1), 'aunt': sphereShellRadius(1),
  'father-in-law': sphereShellRadius(1), 'mother-in-law': sphereShellRadius(1),
  'you': sphereShellRadius(0), 'self': sphereShellRadius(0),
  'husband': sphereShellRadius(0), 'wife': sphereShellRadius(0),
  'brother': sphereShellRadius(0), 'sister': sphereShellRadius(0),
  'cousin': sphereShellRadius(0),
  'son': sphereShellRadius(-1), 'daughter': sphereShellRadius(-1),
  'nephew': sphereShellRadius(-1), 'niece': sphereShellRadius(-1),
  'grandson': sphereShellRadius(-2), 'granddaughter': sphereShellRadius(-2),
}

export function getSphereOrbitRadius(data) {
  // BFS-computed generation takes priority
  if (typeof data.generation === 'number') return sphereShellRadius(data.generation)
  if (data.isSelf) return sphereShellRadius(0)
  const rel = (data.relationshipToSelf ?? '').trim().toLowerCase()
  return GENERATION_RADIUS[rel] ?? sphereShellRadius(0)
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function randomOnSphere(r) {
  const u     = Math.random() * 2 - 1
  const theta = Math.random() * Math.PI * 2
  const s     = Math.sqrt(1 - u * u)
  return { x: r * s * Math.cos(theta), y: r * s * Math.sin(theta), z: r * u }
}

// Place a point at radius r, in roughly the direction of dir, with spread.
function placeNearDir(dir, r, spread = 0.35) {
  const len = Math.sqrt(dir.x * dir.x + dir.y * dir.y + dir.z * dir.z) || 1
  const ux = dir.x / len + (Math.random() - 0.5) * spread
  const uy = dir.y / len + (Math.random() - 0.5) * spread
  const uz = dir.z / len + (Math.random() - 0.5) * spread
  const nl = Math.sqrt(ux * ux + uy * uy + uz * uz) || 1
  return { x: r * ux / nl, y: r * uy / nl, z: r * uz / nl }
}

function buildSpouseMap(edges) {
  const m = {}
  for (const e of edges) {
    const rt = (e.relType ?? '').toUpperCase()
    if (rt.includes('SPOUSE') || rt.includes('PARTNER') || rt.includes('MARRIAGE')) {
      m[e.sourceId] = e.targetId
      m[e.targetId] = e.sourceId
    }
  }
  return m
}

// ── Layout object ─────────────────────────────────────────────────────────────
const SphereLayout = {
  id: 'sphere',
  label: 'Sphere',
  icon: '◎',

  getInitialPosition(node) {
    return randomOnSphere(node.orbitRadius ?? sphereShellRadius(node.generation ?? 0))
  },

  // Parent-guided batch placement:
  // Processes generations from highest (ancestors) to lowest (descendants).
  // Each node starts in the same 3D direction as its parents — so children are
  // placed near their parents on the sphere surface, and siblings cluster together.
  getInitialPositions(nodes, edges) {
    const spouseOf = buildSpouseMap(edges)

    // PARENT_OF: childId → [parentIds]
    const parentsOf = {}
    for (const e of edges) {
      if ((e.relType ?? '').toUpperCase() !== 'PARENT_OF') continue
      if (!parentsOf[e.targetId]) parentsOf[e.targetId] = []
      parentsOf[e.targetId].push(e.sourceId)
    }

    // Group by generation, process ancestors first
    const byGen = new Map()
    for (const n of nodes) {
      const gen = n.generation ?? 0
      if (!byGen.has(gen)) byGen.set(gen, [])
      byGen.get(gen).push(n)
    }
    const gensSorted = [...byGen.keys()].sort((a, b) => b - a)

    const positions = new Map()

    for (const gen of gensSorted) {
      const genNodes = byGen.get(gen)
      // Use the population-aware radius the store stamped onto each node; fall
      // back to the legacy fixed radius only if it's somehow missing.
      const r = genNodes[0]?.orbitRadius ?? sphereShellRadius(gen)

      // Process spouses together so they start adjacent on the shell
      const placed = new Set()

      for (const n of genNodes) {
        if (placed.has(n.id)) continue

        const pIds = parentsOf[n.id] ?? []
        let dirX = 0, dirY = 0, dirZ = 0, hits = 0
        for (const pid of pIds) {
          const p = positions.get(pid)
          if (!p) continue
          const plen = Math.sqrt(p.x * p.x + p.y * p.y + p.z * p.z) || 1
          dirX += p.x / plen; dirY += p.y / plen; dirZ += p.z / plen; hits++
        }

        let pos
        if (hits > 0) {
          pos = placeNearDir({ x: dirX, y: dirY, z: dirZ }, r)
        } else if (n.isSelf) {
          // Self anchors to a fixed point so the family clusters around it
          pos = { x: r, y: 0, z: 0 }
        } else {
          pos = randomOnSphere(r)
        }
        positions.set(n.id, pos)
        placed.add(n.id)

        // Place spouse nearby (same direction, tiny extra spread)
        const spouseId = spouseOf[n.id]
        if (spouseId && !placed.has(spouseId)) {
          const spouseNode = genNodes.find(x => x.id === spouseId)
          if (spouseNode) {
            positions.set(spouseId, placeNearDir(pos, r, 0.15))
            placed.add(spouseId)
          }
        }
      }
    }

    return positions
  },

  constrain(x, y, z, vx, vy, vz, node) {
    const len   = Math.sqrt(x * x + y * y + z * z) || 1
    const scale = (node.orbitRadius ?? sphereShellRadius(node.generation ?? 0)) / len
    const sx = x * scale
    const sy = y * scale
    const sz = z * scale
    const rx = sx / (node.orbitRadius || 1)
    const ry = sy / (node.orbitRadius || 1)
    const rz = sz / (node.orbitRadius || 1)
    const radial = vx * rx + vy * ry + vz * rz
    return {
      x: sx, y: sy, z: sz,
      vx: vx - radial * rx,
      vy: vy - radial * ry,
      vz: vz - radial * rz,
    }
  },

  // Larger, population-sized shells mean nodes sit farther apart, so repulsion
  // (∝ 1/dist²) is weaker between them — bump it a little to keep them fanned
  // out across the shell surface rather than clumping where parents placed them.
  physics: { repulsion: 26000, attraction: 0.00025, damping: 0.88 },
}

export default SphereLayout
