// ── GlowStyle.jsx ─────────────────────────────────────────────────────────────
// Relationship-aware glow edge style.
// Two overlapping lines per edge: wide faint halo + thin bright core.
// In-law edges are dashed.

import { Line } from '@react-three/drei'

function edgeCategory(relType) {
  const r = (relType ?? '').toUpperCase()
  if (r.includes('SPOUSE') || r.includes('PARTNER') || r.includes('MARRIAGE')) return 'spouse'
  if (r.includes('IN_LAW') || r.includes('INLAW'))                              return 'inlaw'
  return 'blood'
}

const EDGE_GLOW = {
  blood:  { halo: 'rgb(100,100,200)',  core: 'rgb(140,140,225)' },
  spouse: { halo: '#EA580C',           core: '#FF7A40'          },
  inlaw:  { halo: '#C4A882',           core: '#D4B892'          },
}

export default function GlowStyle({ edge, sourceNode, targetNode }) {
  const points = [
    [sourceNode.x, sourceNode.y, sourceNode.z],
    [targetNode.x, targetNode.y, targetNode.z],
  ]
  const cat    = edgeCategory(edge?.relType)
  const { halo, core } = EDGE_GLOW[cat]
  const dashed = cat === 'inlaw'
  const dashProps = dashed ? { dashed: true, dashSize: 10, gapSize: 5 } : { dashed: false }

  return (
    <>
      <Line points={points} color={halo} lineWidth={3} transparent opacity={0.12} {...dashProps} />
      <Line points={points} color={core} lineWidth={1} transparent opacity={0.65} {...dashProps} />
    </>
  )
}
