import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import useGraphStore from '../store/useGraphStore'

// Above 50 nodes, switch to InstancedMesh in Graph.jsx for better performance.
// Each Node currently runs its own useFrame subscription and sphere geometry.
export default function Node({ node }) {
  const meshRef    = useRef()
  const hoveredRef = useRef(false)

  const selectedNodeId    = useGraphStore((s) => s.selectedNodeId)
  const connectMode       = useGraphStore((s) => s.connectMode)
  const pendingConnectId  = useGraphStore((s) => s.pendingConnectId)
  const selectNode        = useGraphStore((s) => s.selectNode)
  const addEdge           = useGraphStore((s) => s.addEdge)
  const setPendingConnect = useGraphStore((s) => s.setPendingConnect)

  const isSelected = node.id === selectedNodeId

  // Drive scale directly on the mesh ref — avoids a re-render every frame.
  useFrame(() => {
    if (!meshRef.current) return
    if (isSelected) {
      // pulse between 1.0 and 1.3
      meshRef.current.scale.setScalar(1.15 + 0.15 * Math.sin(Date.now() * 0.003))
    } else {
      meshRef.current.scale.setScalar(hoveredRef.current ? 1.2 : 1)
    }
  })

  function handleClick(e) {
    e.stopPropagation()
    if (!connectMode) {
      selectNode(node.id)
    } else if (pendingConnectId === null) {
      setPendingConnect(node.id)
    } else if (pendingConnectId !== node.id) {
      addEdge(pendingConnectId, node.id)
      setPendingConnect(null)
    }
  }

  function handlePointerOver(e) {
    e.stopPropagation()
    hoveredRef.current = true
    document.body.style.cursor = 'pointer'
  }

  function handlePointerOut(e) {
    e.stopPropagation()
    hoveredRef.current = false
    document.body.style.cursor = 'default'
  }

  return (
    <group position={[node.x, node.y, node.z]}>
      <mesh
        ref={meshRef}
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        <sphereGeometry args={[8, 32, 32]} />
        <meshStandardMaterial color={node.color} />
      </mesh>

      {isSelected && (
        <mesh scale={1.4}>
          <sphereGeometry args={[8, 16, 16]} />
          <meshBasicMaterial color="white" wireframe />
        </mesh>
      )}
    </group>
  )
}
