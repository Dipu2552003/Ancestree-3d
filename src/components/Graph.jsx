import { useEffect, useMemo, useRef } from 'react'
import { OrbitControls, Html } from '@react-three/drei'
import { useThree, useFrame } from '@react-three/fiber'
import useGraphStore from '../store/useGraphStore'
import { useSimulation } from '../physics/useSimulation'
import Node from './Node'
import Edge from './Edge'

const ORBIT_RADII = [120, 220, 320]

const SEED_NODES = [
  // Inner shell — foundational concepts
  { label: 'Machine Learning',      category: 'concept', orbitRadius: 120 },
  { label: 'Neural Networks',       category: 'concept', orbitRadius: 120 },
  { label: 'Python',                category: 'skill',   orbitRadius: 120 },
  { label: 'Linear Algebra',        category: 'fact',    orbitRadius: 120 },
  { label: 'Backpropagation',       category: 'concept', orbitRadius: 120 },
  // Middle shell — applied knowledge
  { label: 'Deep Learning',         category: 'concept', orbitRadius: 220 },
  { label: 'Data Wrangling',        category: 'skill',   orbitRadius: 220 },
  { label: 'Gradient Descent',      category: 'fact',    orbitRadius: 220 },
  { label: 'Activation Functions',  category: 'fact',    orbitRadius: 220 },
  { label: 'Research Notes',        category: 'memory',  orbitRadius: 220 },
  // Outer shell — goals and ideas
  { label: 'Computer Vision',       category: 'idea',    orbitRadius: 320 },
  { label: 'NLP',                   category: 'idea',    orbitRadius: 320 },
  { label: 'Transformers',          category: 'concept', orbitRadius: 320 },
  { label: 'Build Knowledge Graph', category: 'idea',    orbitRadius: 320 },
  { label: 'Career Roadmap',        category: 'memory',  orbitRadius: 320 },
]

// Pairs of labels — resolved to IDs after seeding.
const SEED_EDGES = [
  ['Machine Learning',     'Neural Networks'],
  ['Machine Learning',     'Data Wrangling'],
  ['Linear Algebra',       'Neural Networks'],
  ['Neural Networks',      'Backpropagation'],
  ['Neural Networks',      'Deep Learning'],
  ['Backpropagation',      'Gradient Descent'],
  ['Gradient Descent',     'Activation Functions'],
  ['Data Wrangling',       'Deep Learning'],
  ['Deep Learning',        'Computer Vision'],
  ['Deep Learning',        'NLP'],
  ['NLP',                  'Transformers'],
  ['Transformers',         'Computer Vision'],
  ['Build Knowledge Graph','Research Notes'],
  ['Career Roadmap',       'Build Knowledge Graph'],
]

export default function Graph() {
  const nodes          = useGraphStore((s) => s.nodes)
  const edges          = useGraphStore((s) => s.edges)
  const selectedNodeId = useGraphStore((s) => s.selectedNodeId)

  const { camera } = useThree()

  // fly-to target: { x, y, z } or null
  const flyTarget = useRef(null)

  // seed nodes + edges once on first mount
  useEffect(() => {
    if (useGraphStore.getState().nodes.length > 0) return
    SEED_NODES.forEach(({ label, category, orbitRadius }) => {
      useGraphStore.getState().addNode(label, category, orbitRadius)
    })
    const { nodes } = useGraphStore.getState()
    const byLabel = Object.fromEntries(nodes.map((n) => [n.label, n.id]))
    SEED_EDGES.forEach(([a, b]) => {
      const sid = byLabel[a], tid = byLabel[b]
      if (sid && tid) useGraphStore.getState().addEdge(sid, tid)
    })
  }, [])

  // update fly-to target whenever selected node changes
  useEffect(() => {
    if (!selectedNodeId) { flyTarget.current = null; return }
    const node = useGraphStore.getState().nodes.find((n) => n.id === selectedNodeId)
    if (!node) return
    // aim camera at a point 200 units in front of the node along its outward direction
    const len = Math.sqrt(node.x * node.x + node.y * node.y + node.z * node.z) || 1
    flyTarget.current = {
      x: node.x + (node.x / len) * 200,
      y: node.y + (node.y / len) * 200,
      z: node.z + (node.z / len) * 200,
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
      <OrbitControls enableDamping dampingFactor={0.08} />
      <ambientLight intensity={0.2} />
      <pointLight position={[200, 200, 200]} intensity={1.5} />

      {/* Orbit shell guide rings — very subtle, non-interactive */}
      {ORBIT_RADII.map((r) => (
        <mesh key={r}>
          <sphereGeometry args={[r, 36, 36]} />
          <meshBasicMaterial color="white" wireframe transparent opacity={0.04} />
        </mesh>
      ))}

      {edges.map((edge) => {
        const src = nodeMap[edge.sourceId]
        const tgt = nodeMap[edge.targetId]
        if (!src || !tgt) return null
        return <Edge key={edge.id} sourceNode={src} targetNode={tgt} />
      })}

      {nodes.map((node) => (
        <group key={node.id}>
          <Node node={node} />
          <Html position={[node.x, node.y + 14, node.z]} center>
            <span style={{
              color: '#fff',
              fontSize: 12,
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              textShadow: '0 1px 4px rgba(0,0,0,0.8)',
              userSelect: 'none',
            }}>
              {node.label}
            </span>
          </Html>
        </group>
      ))}
    </>
  )
}
