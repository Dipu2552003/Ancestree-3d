import { useEffect, useMemo, useRef, useState } from 'react'
import { OrbitControls, Line } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import useGraphStore from '../store/useGraphStore'
import { useSimulation } from '../physics/useSimulation'
import useIsMobile from '../lib/useIsMobile'
import Node from './Node'
import NodeSprites from './NodeSprites'
import BatchedEdges from './BatchedEdges'
import LayoutGuides from './LayoutGuides'

// ── Hybrid LOD ────────────────────────────────────────────────────────────────
// Every node is always a GPU sprite (NodeSprites — one instanced draw call).
// The expensive HTML polaroid card only mounts for the nodes nearest the
// camera: each card is a live DOM subtree whose transform is recomputed every
// frame on the main thread, so capping the card count is what keeps orbiting
// smooth on large graphs — especially on mobile.
const CARD_BUDGET_DESKTOP = 40
const CARD_BUDGET_MOBILE  = 16
const CARD_DIST_DESKTOP   = 2000
const CARD_DIST_MOBILE    = 1400
// Hysteresis so cards at the boundary don't flicker in/out while orbiting.
const KEEP_MARGIN = 1.25

// Camera fly-to point for a node: a position outside its ring/shell, along the
// node's radial, so OrbitControls (looking at the origin) frames it on screen.
// Shared by the search-selection fly-to and the initial self-node focus.
function computeFlyTarget(node, layout) {
  if (layout === 'cone') {
    // Cone: nodes sit on a horizontal XZ ring at a specific Y height. Fly to a
    // point outside that ring at the node's Y, looking inward.
    const xzLen = Math.sqrt(node.x * node.x + node.z * node.z) || 1
    const viewDist = (node.orbitRadius ?? 360) + 350
    return {
      x: (node.x / xzLen) * viewDist,
      y: node.y + 80,   // slightly above the ring so the node is visible
      z: (node.z / xzLen) * viewDist,
    }
  }
  // Sphere / others: fly along the 3D radial from centre outward.
  const len = Math.sqrt(node.x * node.x + node.y * node.y + node.z * node.z) || 1
  const dist = (node.orbitRadius ?? 320) + 250
  return {
    x: (node.x / len) * dist,
    y: (node.y / len) * dist,
    z: (node.z / len) * dist,
  }
}

export default function Graph() {
  const nodes          = useGraphStore((s) => s.nodes)
  const selectedNodeId = useGraphStore((s) => s.selectedNodeId)
  const fetchGraph     = useGraphStore((s) => s.fetchGraph)
  const showShells     = useGraphStore((s) => s.showShells)
  const showEdges      = useGraphStore((s) => s.showEdges)
  const currentLayout  = useGraphStore((s) => s.currentLayout)
  const pathResults    = useGraphStore((s) => s.pathResults)

  const isMobile = useIsMobile()

  // fly-to target: { x, y, z } or null
  const flyTarget = useRef(null)
  // throttle counter for the dynamic far-plane recompute
  const farTick = useRef(0)
  // throttle counter + current set for the near-camera card selection
  const cardTick = useRef(0)
  const [cardIds, setCardIds] = useState(() => new Set())

  // Load the family graph from the API on mount.
  useEffect(() => {
    fetchGraph()
  }, [fetchGraph])

  // On first landing, frame the user's own node — camera-only (no selection /
  // highlight). The force layout keeps moving nodes for a few seconds after
  // load, so a one-shot fly-to would aim at the self node's transient early
  // position and then watch it drift away (the "keeps moving / never lands on
  // me" bug). Instead we mark auto-focus pending and, in useFrame, re-aim at the
  // self node's *live* position each frame until the camera converges on it.
  const autoFocusing = useRef(false)
  const didAutoFocus = useRef(false)
  useEffect(() => {
    if (didAutoFocus.current || nodes.length === 0) return
    if (!nodes.some((n) => n.isSelf)) return  // wait until the self node exists
    didAutoFocus.current = true
    autoFocusing.current = true
  }, [nodes])

  // update fly-to target whenever selected node changes
  useEffect(() => {
    if (!selectedNodeId) { flyTarget.current = null; return }
    const node = useGraphStore.getState().nodes.find((n) => n.id === selectedNodeId)
    if (!node) return
    flyTarget.current = computeFlyTarget(node, currentLayout)
  }, [selectedNodeId, currentLayout])

  // lerp camera toward fly-to target each frame. We mutate the camera via the
  // useFrame `state` argument (the standard r3f pattern) rather than a closure
  // over useThree()'s camera.
  useFrame((state) => {
    const camera = state.camera

    // While auto-focusing on load, track the self node's current position so the
    // camera follows it as the layout settles instead of chasing a stale point.
    if (autoFocusing.current) {
      const self = useGraphStore.getState().nodes.find((n) => n.isSelf)
      if (self) flyTarget.current = computeFlyTarget(self, useGraphStore.getState().currentLayout)
      else autoFocusing.current = false
    }

    if (flyTarget.current) {
      const t = flyTarget.current
      camera.position.x += (t.x - camera.position.x) * 0.05
      camera.position.y += (t.y - camera.position.y) * 0.05
      camera.position.z += (t.z - camera.position.z) * 0.05
      // stop lerping once close enough — only releases when the node (and thus
      // the target) has settled, so we land squarely on the user's node.
      const dx = t.x - camera.position.x
      const dy = t.y - camera.position.y
      const dz = t.z - camera.position.z
      if (dx * dx + dy * dy + dz * dz < 4) { flyTarget.current = null; autoFocusing.current = false }
    }

    // ── Dynamic far-plane (throttled) ──────────────────────────────────────
    // Population-sized rings can push nodes thousands of units out; a fixed far
    // plane clips them away. Every ~20 frames, size the far plane to the graph's
    // actual extent plus the camera's current distance so nothing is culled.
    if ((farTick.current = (farTick.current + 1) % 20) === 0) {
      const ns = useGraphStore.getState().nodes
      let maxD2 = 0
      for (const n of ns) {
        const d2 = n.x * n.x + n.y * n.y + n.z * n.z
        if (d2 > maxD2) maxD2 = d2
      }
      const maxD   = Math.sqrt(maxD2)
      const camD   = camera.position.length()
      const needed = Math.max(3000, camD + maxD + 1500)
      // Only touch the projection matrix when it meaningfully changes.
      if (needed > camera.far || needed < camera.far * 0.6) {
        camera.far = needed
        camera.updateProjectionMatrix()
      }
    }

    // ── Near-camera card selection (throttled) ─────────────────────────────
    // Pick the K nearest nodes within the card distance; keep already-shown
    // cards up to a wider margin (hysteresis) so the boundary doesn't flicker.
    // Selected / self / path endpoints always get a card.
    if ((cardTick.current = (cardTick.current + 1) % 15) === 0) {
      const st = useGraphStore.getState()
      const ns = st.nodes
      const budget  = isMobile ? CARD_BUDGET_MOBILE : CARD_BUDGET_DESKTOP
      const maxDist = isMobile ? CARD_DIST_MOBILE : CARD_DIST_DESKTOP
      const maxD2   = maxDist * maxDist
      const keepD2  = maxD2 * KEEP_MARGIN * KEEP_MARGIN
      const cx = camera.position.x, cy = camera.position.y, cz = camera.position.z

      const byDist = []
      for (const n of ns) {
        const dx = n.x - cx, dy = n.y - cy, dz = n.z - cz
        byDist.push([dx * dx + dy * dy + dz * dz, n.id])
      }
      byDist.sort((a, b) => a[0] - b[0])

      const next = new Set()
      // Pinned: always carded regardless of distance.
      for (const id of [st.selectedNodeId, st.pathSource, st.pathTarget]) {
        if (id) next.add(id)
      }
      const self = ns.find((n) => n.isSelf)
      if (self) next.add(self.id)

      for (const [d2, id] of byDist) {
        if (next.size >= budget) break
        if (d2 <= maxD2) { next.add(id); continue }
        // hysteresis band: only nodes that already have a card survive here
        if (d2 <= keepD2 && cardIds.has(id)) next.add(id)
        if (d2 > keepD2) break   // sorted — nothing further qualifies
      }

      // Only commit when membership actually changed.
      if (next.size !== cardIds.size || [...next].some((id) => !cardIds.has(id))) {
        setCardIds(next)
      }
    }
  })

  useSimulation()

  const nodeMap = useMemo(() => {
    const m = {}
    nodes.forEach((n) => { m[n.id] = n })
    return m
  }, [nodes])

  // Among all found paths, pick the shortest connection (fewest hops). We keep
  // both the ordered node list (drawn as a bright overlay line) and a set of its
  // undirected edge keys (so any matching real edge is highlighted too). Every
  // other edge is dulled while paths are shown.
  const { shortestPath, shortestPathEdges } = useMemo(() => {
    if (!pathResults || pathResults.length === 0) {
      return { shortestPath: null, shortestPathEdges: null }
    }
    let best = null
    for (const p of pathResults) {
      if (!best || p.length < best.length) best = p
    }
    const set = new Set()
    for (let i = 1; i < best.length; i++) {
      set.add(`${best[i - 1]}|${best[i]}`)
      set.add(`${best[i]}|${best[i - 1]}`)
    }
    return { shortestPath: best, shortestPathEdges: set }
  }, [pathResults])

  // Build the overlay polyline points from current node positions. The shortest
  // path can hop through sibling links (which aren't drawn as edges), so this
  // overlay guarantees the highlighted connection is always visible.
  const shortestPathPoints = useMemo(() => {
    if (!shortestPath || shortestPath.length < 2) return null
    const pts = shortestPath
      .map((id) => nodeMap[id])
      .filter(Boolean)
      .map((n) => [n.x, n.y, n.z])
    return pts.length >= 2 ? pts : null
  }, [shortestPath, nodeMap])

  // Cone guide rings are derived from the actual nodes so the drawn circles
  // always match the population-sized rings the nodes sit on. One entry per
  // generation: its Y height and (shared) ring radius.
  const coneRings = useMemo(() => {
    if (currentLayout !== 'cone') return []
    const byGen = new Map()
    nodes.forEach((n) => {
      const g = n.generation ?? 0
      if (!byGen.has(g)) byGen.set(g, { gen: g, y: n.y, r: n.orbitRadius ?? 90 })
    })
    return [...byGen.values()]
  }, [currentLayout, nodes])

  // Sphere shell guides are likewise derived from the actual nodes so the drawn
  // shells match the population-sized radius each generation sits on.
  const sphereShells = useMemo(() => {
    if (currentLayout !== 'sphere') return []
    const byGen = new Map()
    nodes.forEach((n) => {
      const g = n.generation ?? 0
      if (!byGen.has(g)) byGen.set(g, { gen: g, r: n.orbitRadius ?? 550 })
    })
    return [...byGen.values()]
  }, [currentLayout, nodes])

  return (
    <>
      <OrbitControls
        enableDamping
        dampingFactor={0.08}
        target={[0, 0, 0]}
        mouseButtons={{ LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: null }}
        // User grabbed the camera — stop the load-time auto-focus so we don't
        // fight them while the layout is still settling.
        onStart={() => { autoFocusing.current = false; flyTarget.current = null }}
      />
      <ambientLight intensity={0.3} />
      <pointLight position={[0, 0, 0]} intensity={0.8} />
      <pointLight position={[500, 500, 500]} intensity={1.0} />

      {/* Layout visual guides — shells, rings, or lines for the active layout */}
      {showShells && <LayoutGuides layoutId={currentLayout} coneRings={coneRings} sphereShells={sphereShells} />}

      {/* All edges batched into two draw calls (solid + dashed in-law).
          Sibling links are excluded inside (same-ring grouping, never drawn).
          Path mode highlights/dulls via baked vertex colors. */}
      {showEdges && <BatchedEdges shortestPathEdges={shortestPathEdges} />}

      {/* Shortest-connection overlay — bright green polyline drawn on top of
          everything, regardless of which underlying edges exist. Always shown
          when a path is active, even if edges are hidden (e.g. mobile default),
          so the path feature still reveals the connection. */}
      {shortestPathPoints && (
        <>
          <Line points={shortestPathPoints} color="#16A34A" lineWidth={6} transparent opacity={0.35} depthTest={false} renderOrder={998} />
          <Line points={shortestPathPoints} color="#4ADE80" lineWidth={2.5} transparent opacity={1} depthTest={false} renderOrder={999} />
        </>
      )}

      {/* Hybrid LOD: every node is a GPU sprite; the HTML polaroid card only
          mounts for the near-camera set (plus selected/self/path endpoints).
          Carded nodes get their sprite hidden inside NodeSprites. */}
      <NodeSprites hiddenIds={cardIds} />
      {nodes.filter((n) => cardIds.has(n.id)).map((node) => (
        <Node key={node.id} node={node} />
      ))}
    </>
  )
}
