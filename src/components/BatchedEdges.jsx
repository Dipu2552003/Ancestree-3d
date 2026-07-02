// ── BatchedEdges.jsx ──────────────────────────────────────────────────────────
// All edges in TWO draw calls (one solid LineSegments, one dashed for in-laws)
// instead of one drei <Line> (Line2 shader + own draw call) per edge — the
// per-edge version was a large share of the render cost on big graphs.
//
// Positions are written imperatively into the buffer each frame from the store
// (no React re-render involved), so the hot physics phase doesn't rebuild any
// line geometry through React. Colors are baked per-vertex once per topology /
// style / path change.
//
// ponytail: fixed 1px line width (LineBasicMaterial limit) — the old Line2
// widths were 1–1.5px anyway. The 'glow' style is approximated with a brighter
// palette; bring back the halo pass with fat-line batching if anyone misses it.

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import useGraphStore from '../store/useGraphStore'

function edgeCategory(relType) {
  const r = (relType ?? '').toUpperCase()
  if (r.includes('SPOUSE') || r.includes('PARTNER') || r.includes('MARRIAGE')) return 'spouse'
  if (r.includes('IN_LAW') || r.includes('INLAW'))                              return 'inlaw'
  return 'blood'
}

// Palette per edge-style id — the ControlPanel style picker swaps these.
const PALETTES = {
  line: { blood: '#8282D7', spouse: '#EA580C', inlaw: '#C4A882' },
  glow: { blood: '#9C9CEB', spouse: '#FF7A40', inlaw: '#D4B892' },
}
const HIGHLIGHT = '#22C55E'
const DULL_MUL  = 0.22   // brightness multiplier for non-path edges in path mode

export default function BatchedEdges({ shortestPathEdges }) {
  const edges            = useGraphStore((s) => s.edges)
  const currentEdgeStyle = useGraphStore((s) => s.currentEdgeStyle)
  const solidRef  = useRef()
  const dashedRef = useRef()

  // Topology + baked colors. Rebuilt only when edges / style / path change.
  const { solid, dashed } = useMemo(() => {
    const palette = PALETTES[currentEdgeStyle] ?? PALETTES.line
    const groups = { solid: [], dashed: [] }

    for (const e of edges) {
      const rel = (e.relType ?? '').toUpperCase()
      if (rel === 'SIBLING_OF') continue   // never drawn (same-ring grouping)
      const cat = edgeCategory(e.relType)

      const c = new THREE.Color(palette[cat])
      if (shortestPathEdges) {
        if (shortestPathEdges.has(`${e.sourceId}|${e.targetId}`)) c.set(HIGHLIGHT)
        else c.multiplyScalar(DULL_MUL)
      }
      groups[cat === 'inlaw' ? 'dashed' : 'solid'].push({ s: e.sourceId, t: e.targetId, c })
    }

    const build = (list) => {
      const positions = new Float32Array(list.length * 6)
      const colors    = new Float32Array(list.length * 6)
      const endpoints = new Array(list.length * 2)
      list.forEach((e, i) => {
        endpoints[i * 2]     = e.s
        endpoints[i * 2 + 1] = e.t
        for (const off of [0, 3]) {
          colors[i * 6 + off]     = e.c.r
          colors[i * 6 + off + 1] = e.c.g
          colors[i * 6 + off + 2] = e.c.b
        }
      })
      return { positions, colors, endpoints, count: list.length }
    }

    return { solid: build(groups.solid), dashed: build(groups.dashed) }
  }, [edges, currentEdgeStyle, shortestPathEdges])

  // Write endpoint positions from the live store nodes. Runs every frame — a
  // plain typed-array copy, orders of magnitude cheaper than per-edge geometry.
  useFrame(() => {
    const nodes = useGraphStore.getState().nodes
    if (nodes.length === 0) return
    const pos = {}
    for (const n of nodes) pos[n.id] = n

    const write = (ref, group, isDashed) => {
      const line = ref.current
      if (!line || group.count === 0) return
      const arr = line.geometry.attributes.position.array
      for (let i = 0; i < group.endpoints.length; i++) {
        const n = pos[group.endpoints[i]]
        if (!n) continue
        arr[i * 3]     = n.x
        arr[i * 3 + 1] = n.y
        arr[i * 3 + 2] = n.z
      }
      line.geometry.attributes.position.needsUpdate = true
      line.geometry.computeBoundingSphere()
      if (isDashed) line.computeLineDistances()
    }
    write(solidRef,  solid,  false)
    write(dashedRef, dashed, true)
  })

  return (
    <>
      {solid.count > 0 && (
        <lineSegments ref={solidRef} key={`s${solid.count}-${currentEdgeStyle}-${!!shortestPathEdges}`} frustumCulled={false}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[solid.positions, 3]} />
            <bufferAttribute attach="attributes-color"    args={[solid.colors, 3]} />
          </bufferGeometry>
          <lineBasicMaterial vertexColors transparent opacity={0.55} />
        </lineSegments>
      )}
      {dashed.count > 0 && (
        <lineSegments ref={dashedRef} key={`d${dashed.count}-${currentEdgeStyle}-${!!shortestPathEdges}`} frustumCulled={false}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[dashed.positions, 3]} />
            <bufferAttribute attach="attributes-color"    args={[dashed.colors, 3]} />
          </bufferGeometry>
          <lineDashedMaterial vertexColors transparent opacity={0.5} dashSize={8} gapSize={4} />
        </lineSegments>
      )}
    </>
  )
}
