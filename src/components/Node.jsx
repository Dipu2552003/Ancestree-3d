import { Html } from '@react-three/drei'
import useGraphStore from '../store/useGraphStore'
import { getNodeStyle } from '../nodeStyles'

export default function Node({ node }) {
  const selectedNodeId   = useGraphStore((s) => s.selectedNodeId)
  const selectNode       = useGraphStore((s) => s.selectNode)
  const isDark           = useGraphStore((s) => s.isDark)
  const pathMode         = useGraphStore((s) => s.pathMode)
  const pathSource       = useGraphStore((s) => s.pathSource)
  const pathTarget       = useGraphStore((s) => s.pathTarget)
  const pathResults      = useGraphStore((s) => s.pathResults)
  const setPathNode      = useGraphStore((s) => s.setPathNode)
  const currentNodeStyle = useGraphStore((s) => s.currentNodeStyle)

  const isSelected   = node.id === selectedNodeId
  const isPathSource = node.id === pathSource
  const isPathTarget = node.id === pathTarget
  const isOnPath     = pathResults.length > 0 && pathResults.some((p) => p.includes(node.id))

  const StyleComponent = getNodeStyle(currentNodeStyle)

  function handleClick(e) {
    e.stopPropagation()
    if (pathMode) { setPathNode(node.id); return }
    selectNode(node.id)
  }

  return (
    <group position={[node.x, node.y, node.z]}>
      <Html
        center
        occlude={false}
        distanceFactor={320}
        style={{ pointerEvents: 'auto' }}
      >
        <StyleComponent
          node={node}
          isSelected={isSelected}
          isPathSource={isPathSource}
          isPathTarget={isPathTarget}
          isOnPath={isOnPath}
          isDark={isDark}
          onClick={handleClick}
        />
      </Html>
    </group>
  )
}
