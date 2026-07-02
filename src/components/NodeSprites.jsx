// ── NodeSprites.jsx ───────────────────────────────────────────────────────────
// GPU half of the hybrid-LOD node rendering: every node is an instance of ONE
// low-poly sphere mesh (one draw call, any family size). The HTML polaroid
// cards — the expensive part, one DOM subtree per node updated every frame —
// only mount for the nodes near the camera (see Graph.jsx); their sprite
// instance is scaled to 0 here so there's no dot behind the card.
//
// Positions/colors are written imperatively in useFrame from the store, so the
// hot physics phase never re-renders this component. React only touches it
// when the node COUNT changes (instance buffers must be re-allocated).

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import useGraphStore from '../store/useGraphStore'

const tmpMatrix = new THREE.Matrix4()
const tmpColor  = new THREE.Color()
const colorCache = new Map()   // hex string → THREE.Color (skip re-parsing)

function cachedColor(hex) {
  let c = colorCache.get(hex)
  if (!c) { c = new THREE.Color(hex); colorCache.set(hex, c) }
  return c
}

export default function NodeSprites({ hiddenIds }) {
  // Subscribe to the COUNT only — position updates are imperative.
  const count = useGraphStore((s) => s.nodes.length)
  const meshRef = useRef()
  const hiddenRef = useRef(hiddenIds)
  hiddenRef.current = hiddenIds

  useFrame(() => {
    const mesh = meshRef.current
    if (!mesh) return
    const { nodes, selectedNodeId } = useGraphStore.getState()
    const hidden = hiddenRef.current
    const n = Math.min(nodes.length, mesh.count)

    for (let i = 0; i < n; i++) {
      const node = nodes[i]
      const scale = hidden?.has(node.id)
        ? 0
        : (node.isSelf || node.id === selectedNodeId) ? 1.6 : 1
      tmpMatrix.makeScale(scale, scale, scale)
      tmpMatrix.setPosition(node.x, node.y, node.z)
      mesh.setMatrixAt(i, tmpMatrix)
      tmpColor.copy(cachedColor(node.color ?? '#aaaacc'))
      mesh.setColorAt(i, tmpColor)
    }
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  })

  if (count === 0) return null

  const pick = (e) => {
    e.stopPropagation()
    const { nodes, pathMode, setPathNode, selectNode } = useGraphStore.getState()
    const node = nodes[e.instanceId]
    if (!node) return
    if (pathMode) setPathNode(node.id)
    else selectNode(node.id)
  }

  return (
    <instancedMesh
      key={count}
      ref={meshRef}
      args={[null, null, count]}
      frustumCulled={false}
      onClick={pick}
      onPointerOver={() => { document.body.style.cursor = 'pointer' }}
      onPointerOut={() =>  { document.body.style.cursor = 'default' }}
    >
      <sphereGeometry args={[13, 12, 8]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  )
}
