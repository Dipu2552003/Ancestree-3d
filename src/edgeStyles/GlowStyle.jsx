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

export default function GlowStyle({ edge, sourceNode, targetNode, pathState }) {
  const points = [
    [sourceNode.x, sourceNode.y, sourceNode.z],
    [targetNode.x, targetNode.y, targetNode.z],
  ]
  const cat    = edgeCategory(edge?.relType)
  let { halo, core } = EDGE_GLOW[cat]
  const dashed = cat === 'inlaw'
  const dashProps = dashed ? { dashed: true, dashSize: 10, gapSize: 5 } : { dashed: false }

  // Path mode: emphasise the shortest connection, fade everything else.
  let haloWidth = 3, coreWidth = 1, haloOpacity = 0.12, coreOpacity = 0.65
  if (pathState === 'highlight') {
    halo = '#22C55E'; core = '#86EFAC'
    haloWidth = 5; coreWidth = 2; haloOpacity = 0.35; coreOpacity = 1
  } else if (pathState === 'dull') {
    haloOpacity *= 0.15; coreOpacity *= 0.15
  }

  return (
    <>
      <Line points={points} color={halo} lineWidth={haloWidth} transparent opacity={haloOpacity} {...dashProps} />
      <Line points={points} color={core} lineWidth={coreWidth} transparent opacity={coreOpacity} {...dashProps} />
    </>
  )
}
