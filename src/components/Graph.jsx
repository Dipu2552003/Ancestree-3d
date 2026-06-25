import { useEffect, useMemo, useRef } from 'react'
import { OrbitControls, Line } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import useGraphStore from '../store/useGraphStore'
import { useSimulation } from '../physics/useSimulation'
import Node from './Node'
import Edge from './Edge'
import LayoutGuides from './LayoutGuides'

export default function Graph() {
  const nodes          = useGraphStore((s) => s.nodes)
  const edges          = useGraphStore((s) => s.edges)
  const selectedNodeId = useGraphStore((s) => s.selectedNodeId)
  const fetchGraph     = useGraphStore((s) => s.fetchGraph)
  const showShells     = useGraphStore((s) => s.showShells)
  const showEdges      = useGraphStore((s) => s.showEdges)
  const currentLayout  = useGraphStore((s) => s.currentLayout)
  const pathResults    = useGraphStore((s) => s.pathResults)

  // fly-to target: { x, y, z } or null
  const flyTarget = useRef(null)
  // throttle counter for the dynamic far-plane recompute
  const farTick = useRef(0)

  // Load the family graph from the API on mount.
  useEffect(() => {
    fetchGraph()
  }, [fetchGraph])

  // update fly-to target whenever selected node changes
  useEffect(() => {
    if (!selectedNodeId) { flyTarget.current = null; return }
    const node = useGraphStore.getState().nodes.find((n) => n.id === selectedNodeId)
    if (!node) return

    if (currentLayout === 'cone') {
      // Cone: nodes sit on a horizontal XZ ring at a specific Y height.
      // Fly the camera to a point outside that ring at the node's Y, looking inward.
      const xzLen = Math.sqrt(node.x * node.x + node.z * node.z) || 1
      const viewDist = (node.orbitRadius ?? 360) + 350
      flyTarget.current = {
        x: (node.x / xzLen) * viewDist,
        y: node.y + 80,   // slightly above the ring so the node is visible
        z: (node.z / xzLen) * viewDist,
      }
    } else {
      // Sphere / others: fly along the 3D radial from centre outward.
      const len = Math.sqrt(node.x * node.x + node.y * node.y + node.z * node.z) || 1
      const dist = (node.orbitRadius ?? 320) + 250
      flyTarget.current = {
        x: (node.x / len) * dist,
        y: (node.y / len) * dist,
        z: (node.z / len) * dist,
      }
    }
  }, [selectedNodeId, currentLayout])

  // lerp camera toward fly-to target each frame. We mutate the camera via the
  // useFrame `state` argument (the standard r3f pattern) rather than a closure
  // over useThree()'s camera.
  useFrame((state) => {
    const camera = state.camera
    if (flyTarget.current) {
      const t = flyTarget.current
      camera.position.x += (t.x - camera.position.x) * 0.05
      camera.position.y += (t.y - camera.position.y) * 0.05
      camera.position.z += (t.z - camera.position.z) * 0.05
      // stop lerping once close enough
      const dx = t.x - camera.position.x
      const dy = t.y - camera.position.y
      const dz = t.z - camera.position.z
      if (dx * dx + dy * dy + dz * dz < 4) flyTarget.current = null
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
      />
      <ambientLight intensity={0.3} />
      <pointLight position={[0, 0, 0]} intensity={0.8} />
      <pointLight position={[500, 500, 500]} intensity={1.0} />

      {/* Layout visual guides — shells, rings, or lines for the active layout */}
      {showShells && <LayoutGuides layoutId={currentLayout} coneRings={coneRings} sphereShells={sphereShells} />}

      {showEdges && edges.map((edge) => {
        // Only draw parent/spouse relations — sibling links are intentionally
        // not rendered (siblings are already grouped on the same ring).
        if ((edge.relType ?? '').toUpperCase() === 'SIBLING_OF') return null
        const src = nodeMap[edge.sourceId]
        const tgt = nodeMap[edge.targetId]
        if (!src || !tgt) return null
        // While paths are shown: highlight the shortest one, dull the rest.
        let pathState = null
        if (shortestPathEdges) {
          pathState = shortestPathEdges.has(`${edge.sourceId}|${edge.targetId}`)
            ? 'highlight'
            : 'dull'
        }
        return <Edge key={edge.id} edge={edge} sourceNode={src} targetNode={tgt} pathState={pathState} />
      })}

      {/* Shortest-connection overlay — bright green polyline drawn on top of
          everything, regardless of which underlying edges exist. */}
      {showEdges && shortestPathPoints && (
        <>
          <Line points={shortestPathPoints} color="#16A34A" lineWidth={6} transparent opacity={0.35} depthTest={false} renderOrder={998} />
          <Line points={shortestPathPoints} color="#4ADE80" lineWidth={2.5} transparent opacity={1} depthTest={false} renderOrder={999} />
        </>
      )}

      {nodes.map((node) => (
        <Node key={node.id} node={node} />
      ))}
    </>
  )
}
