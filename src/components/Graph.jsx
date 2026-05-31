import { useEffect, useMemo, useRef } from 'react'
import { OrbitControls, Html, Line } from '@react-three/drei'
import { useThree, useFrame } from '@react-three/fiber'
import useGraphStore, { SHELL_RADII } from '../store/useGraphStore'
import { useSimulation } from '../physics/useSimulation'
import Node from './Node'
import Edge from './Edge'

const SHELL_LABELS = [
  'Great-grandparents',
  'Grandparents',
  'Parents',
  'You',
  'Children',
  'Grandchildren',
]

// 3 great circles (equator + 2 meridians) for a sphere shell of radius r.
function shellCircles(r) {
  const pts = (fn) => Array.from({ length: 129 }, (_, i) => fn((i / 128) * Math.PI * 2))
  return [
    pts((t) => [r * Math.cos(t), 0,              r * Math.sin(t)]),
    pts((t) => [r * Math.cos(t), r * Math.sin(t), 0             ]),
    pts((t) => [0,               r * Math.sin(t), r * Math.cos(t)]),
  ]
}


export default function Graph() {
  const nodes          = useGraphStore((s) => s.nodes)
  const edges          = useGraphStore((s) => s.edges)
  const selectedNodeId = useGraphStore((s) => s.selectedNodeId)
  const fetchGraph     = useGraphStore((s) => s.fetchGraph)
  const isDark         = useGraphStore((s) => s.isDark)
  const showShells     = useGraphStore((s) => s.showShells)
  const showEdges      = useGraphStore((s) => s.showEdges)

  const { camera } = useThree()

  // fly-to target: { x, y, z } or null
  const flyTarget = useRef(null)

  // Load the family graph from the API on mount.
  useEffect(() => {
    fetchGraph()
  }, [fetchGraph])

  // update fly-to target whenever selected node changes
  useEffect(() => {
    if (!selectedNodeId) { flyTarget.current = null; return }
    const node = useGraphStore.getState().nodes.find((n) => n.id === selectedNodeId)
    if (!node) return
    // Move camera to a point 250 units outward along the node's radial direction
    const len = Math.sqrt(node.x * node.x + node.y * node.y + node.z * node.z) || 1
    const dist = node.orbitRadius + 250
    flyTarget.current = {
      x: (node.x / len) * dist,
      y: (node.y / len) * dist,
      z: (node.z / len) * dist,
    }
  }, [selectedNodeId])

  // lerp camera toward fly-to target each frame
  useFrame(() => {
    if (!flyTarget.current) return
    const t = flyTarget.current
    camera.position.x += (t.x - camera.position.x) * 0.05
    camera.position.y += (t.y - camera.position.y) * 0.05
    camera.position.z += (t.z - camera.position.z) * 0.05
    // stop lerping once close enough
    const dx = t.x - camera.position.x
    const dy = t.y - camera.position.y
    const dz = t.z - camera.position.z
    if (dx * dx + dy * dy + dz * dz < 4) flyTarget.current = null
  })

  useSimulation()

  const nodeMap = useMemo(() => {
    const m = {}
    nodes.forEach((n) => { m[n.id] = n })
    return m
  }, [nodes])

  return (
    <>
      <OrbitControls enableDamping dampingFactor={0.08} target={[0, 0, 0]} />
      <ambientLight intensity={0.3} />
      <pointLight position={[0, 0, 0]} intensity={0.8} />
      <pointLight position={[500, 500, 500]} intensity={1.0} />

      {/* Sphere shell guides — 3 great circles per generation shell */}
      {showShells && SHELL_RADII.map((r, idx) => {
        const isSelf = idx === 3
        const color  = isSelf ? '#EA580C' : 'white'
        const op     = isSelf ? 0.22 : 0.08
        const lw     = isSelf ? 1.0 : 0.5
        return (
          <group key={r}>
            {shellCircles(r).map((pts, ci) => (
              <Line key={ci} points={pts} color={color} lineWidth={lw} transparent opacity={op} />
            ))}
            <Html position={[r + 16, 0, 0]} center>
              <span style={{
                color: isSelf ? '#EA580C' : 'rgba(255,255,255,0.3)',
                fontSize: 9,
                whiteSpace: 'nowrap',
                pointerEvents: 'none',
                fontFamily: 'system-ui, sans-serif',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}>
                {SHELL_LABELS[idx]}
              </span>
            </Html>
          </group>
        )
      })}

      {showEdges && edges.map((edge) => {
        const src = nodeMap[edge.sourceId]
        const tgt = nodeMap[edge.targetId]
        if (!src || !tgt) return null
        return <Edge key={edge.id} sourceNode={src} targetNode={tgt} />
      })}

      {nodes.map((node) => (
        <Node key={node.id} node={node} />
      ))}
    </>
  )
}
