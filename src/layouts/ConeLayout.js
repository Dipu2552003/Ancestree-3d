// ── ConeLayout.js ─────────────────────────────────────────────────────────────
// Top-down cone layout — ancestors at the top on a small ring, descendants at
// the bottom on the widest ring.
//
// Y axis (up = positive):
//   gen  3 (great-grandparents)  →  y =  420  (top)
//   gen  2 (grandparents)        →  y =  280
//   gen  1 (parents)             →  y =  140
//   gen  0 (self / spouses)      →  y =    0
//   gen −1 (children)            →  y = −140
//   gen −2 (grandchildren)       →  y = −280  (bottom)
//
// Ring radius — SMALL at top, WIDER going down:
//   r = (MAX_GEN + 1 − gen) × CONE_RADIUS_PER_GEN
//   gen  3 →  1 × 90 =  90   (narrow at top)
//   gen  0 →  4 × 90 = 360
//   gen −2 →  6 × 90 = 540   (wide at bottom)
//
// Physics only moves nodes around their ring (angular XZ motion).
// Y and radius are hard-snapped after every tick.

export const GEN_Y_GAP           = 140   // world units between generations
export const CONE_RADIUS_PER_GEN = 90    // ring radius step per generation (legacy fallback)
export const MAX_GEN             = 3     // highest generation displayed (great-grandparents)

// ── Population-aware ring sizing ────────────────────────────────────────────
// The ring radius is driven by how many people sit on it, not by the
// generation number. We size each ring so neighbouring people keep a roughly
// constant arc-length gap (RING_NODE_ARC) along the circumference:
//
//   circumference = count × RING_NODE_ARC   →   radius = count × ARC / (2π)
//
// Sparse rings clamp to RING_MIN_RADIUS so a lone person isn't jammed at the
// centre; crowded rings grow as wide as they need to. Because higher (ancestor)
// generations usually hold fewer people and lower (descendant) generations more,
// this naturally yields a cone that bulges where the family is largest.
export const RING_NODE_ARC   = 100   // desired arc-length spacing between adjacent people
export const RING_MIN_RADIUS = 90    // smallest ring radius (1–2 people)

export function coneRingRadiusForCount(count) {
  if (count <= 1) return RING_MIN_RADIUS
  return Math.max(RING_MIN_RADIUS, (count * RING_NODE_ARC) / (2 * Math.PI))
}

// ── helpers ───────────────────────────────────────────────────────────────────

function orbitRadiusToGeneration(r) { return (320 - r) / 80 }

export function nodeGeneration(node) {
  if (typeof node.generation === 'number') return node.generation
  return orbitRadiusToGeneration(node.orbitRadius ?? 320)
}

function coneY(gen) { return gen * GEN_Y_GAP }

// Ring radius is smallest at the top (high gen) and grows going down.
// Floor at CONE_RADIUS_PER_GEN so even gen > MAX_GEN gets a small visible ring.
function coneR(gen) {
  return Math.max(CONE_RADIUS_PER_GEN, (MAX_GEN + 1 - gen) * CONE_RADIUS_PER_GEN)
}

// Sort a generation's node list so spouse pairs end up adjacent in angle.
function arrangeWithSpouses(genNodes, spouseOf) {
  const result = []
  const placed = new Set()
  for (const n of genNodes) {
    if (placed.has(n.id)) continue
    result.push(n)
    placed.add(n.id)
    const sId = spouseOf[n.id]
    if (sId && !placed.has(sId)) {
      const spouse = genNodes.find(x => x.id === sId)
      if (spouse) { result.push(spouse); placed.add(sId) }
    }
  }
  return result
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

// ── layout object ─────────────────────────────────────────────────────────────

const ConeLayout = {
  id: 'cone',
  label: 'Cone',
  icon: '△',

  // Per-node placement (used for single addNode calls). Honours a radius the
  // caller already computed for the node's ring (node.orbitRadius); falls back
  // to the legacy per-generation radius when none is supplied.
  getInitialPosition(node) {
    const gen   = nodeGeneration(node)
    const y     = coneY(gen)
    const r     = node.orbitRadius ?? coneR(gen)
    const angle = Math.random() * Math.PI * 2
    return { x: r * Math.cos(angle), y, z: r * Math.sin(angle) }
  },

  // Batch placement: distributes nodes evenly per generation ring.
  // Processes generations top-down (ancestors first) so each generation
  // can sort its nodes by their parents' already-computed angles.
  // This ensures siblings start adjacent and children start near their
  // parents — drastically reducing the angular distance the physics must cover.
  getInitialPositions(nodes, edges) {
    const spouseOf = buildSpouseMap(edges)

    // Build PARENT_OF map: childId → [parentIds]
    const parentsOf = {}
    for (const e of edges) {
      if ((e.relType ?? '').toUpperCase() !== 'PARENT_OF') continue
      if (!parentsOf[e.targetId]) parentsOf[e.targetId] = []
      parentsOf[e.targetId].push(e.sourceId)
    }

    const byGen = new Map()
    for (const n of nodes) {
      const gen = nodeGeneration(n)
      if (!byGen.has(gen)) byGen.set(gen, [])
      byGen.get(gen).push(n)
    }

    const positions = new Map()

    // Process highest generation first (ancestors → descendants)
    const gensSorted = [...byGen.keys()].sort((a, b) => b - a)

    for (const gen of gensSorted) {
      const genNodes = byGen.get(gen)
      const y = coneY(gen)
      // Ring radius scales with this generation's population.
      const r = coneRingRadiusForCount(genNodes.length)

      // Compute each node's "parent angle" — circular mean of its parents' XZ angles.
      // Nodes whose parents are not yet placed (or have no parents) get null.
      const withParentAngle = genNodes.map(n => {
        const pIds = parentsOf[n.id] ?? []
        let sinSum = 0, cosSum = 0, hits = 0
        for (const pid of pIds) {
          const p = positions.get(pid)
          if (!p) continue
          const a = Math.atan2(p.z, p.x)
          sinSum += Math.sin(a); cosSum += Math.cos(a); hits++
        }
        return { node: n, parentAngle: hits > 0 ? Math.atan2(sinSum, cosSum) : null }
      })

      // Sort: self first (anchors the ring at angle 0), then by parent angle
      // (so siblings with the same parents stay adjacent), orphans at the end.
      withParentAngle.sort((a, b) => {
        if (a.node.isSelf) return -1
        if (b.node.isSelf) return 1
        if (a.parentAngle !== null && b.parentAngle !== null) return a.parentAngle - b.parentAngle
        if (a.parentAngle !== null) return -1
        if (b.parentAngle !== null) return 1
        return 0
      })

      // Keep spouse pairs adjacent (does not change sibling grouping order).
      const sorted = arrangeWithSpouses(withParentAngle.map(x => x.node), spouseOf)
      const count  = sorted.length

      // Start the ring at the first node's parent angle so children start
      // near their parents angularly.  Fall back to 0 for orphan generations.
      const firstItem = withParentAngle.find(x => x.node.id === sorted[0].id)
      const startAngle = firstItem?.parentAngle ?? 0

      sorted.forEach((node, i) => {
        const angle = startAngle + (2 * Math.PI * i) / count
        // Carry orbitRadius so it becomes the node's ring of record (the store
        // spreads this onto the node, and constrain() snaps to it every tick).
        positions.set(node.id, { x: r * Math.cos(angle), y, z: r * Math.sin(angle), orbitRadius: r })
      })
    }

    return positions
  },

  // After physics forces, snap Y and radius — only angle is free to change.
  // The ring radius is the population-aware value stored on the node; fall back
  // to the legacy per-generation radius if it hasn't been computed yet.
  constrain(x, y, z, vx, vy, vz, node) {
    const gen     = nodeGeneration(node)
    const targetY = coneY(gen)
    const r       = node.orbitRadius ?? coneR(gen)

    const xzDist = Math.sqrt(x * x + z * z) || 1
    const scale  = r / xzDist
    const nx     = x * scale
    const nz     = z * scale

    // Cancel radial XZ velocity so nodes only slide around the ring.
    const rx    = nx / r
    const rz    = nz / r
    const radXZ = vx * rx + vz * rz

    return {
      x: nx, y: targetY, z: nz,
      vx: vx - radXZ * rx,
      vy: 0,
      vz: vz - radXZ * rz,
    }
  },

  physics: { repulsion: 12000, attraction: 0.0004, damping: 0.90 },
}

export default ConeLayout
