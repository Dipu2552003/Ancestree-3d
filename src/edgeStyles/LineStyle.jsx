// ── LineStyle.jsx ─────────────────────────────────────────────────────────────
// Relationship-aware line edge style.
// Blood/sibling edges: blue-purple. Spouse: orange. In-law: dashed warm grey.

import { Line } from '@react-three/drei'

function edgeCategory(relType) {
  const r = (relType ?? '').toUpperCase()
  if (r.includes('SPOUSE') || r.includes('PARTNER') || r.includes('MARRIAGE')) return 'spouse'
  if (r.includes('IN_LAW') || r.includes('INLAW'))                              return 'inlaw'
  return 'blood'
}

const EDGE_VISUAL = {
  blood:  { color: 'rgb(130,130,215)', lineWidth: 1,   opacity: 0.50, dashed: false },
  spouse: { color: '#EA580C',          lineWidth: 1.5, opacity: 0.65, dashed: false },
  inlaw:  { color: '#C4A882',          lineWidth: 1,   opacity: 0.45, dashed: true, dashSize: 8, gapSize: 4 },
}

export default function LineStyle({ edge, sourceNode, targetNode, pathState }) {
  const points = [
    [sourceNode.x, sourceNode.y, sourceNode.z],
    [targetNode.x, targetNode.y, targetNode.z],
  ]
  let { color, lineWidth, opacity, dashed, dashSize, gapSize } = EDGE_VISUAL[edgeCategory(edge?.relType)]

  // Path mode: emphasise the shortest connection, fade everything else.
  if (pathState === 'highlight') {
    color = '#22C55E'
    lineWidth = 3
    opacity = 1
    dashed = false
  } else if (pathState === 'dull') {
    opacity = opacity * 0.15
  }

  return (
    <Line
      points={points}
      color={color}
      lineWidth={lineWidth}
      transparent
      opacity={opacity}
      dashed={dashed}
      dashSize={dashed ? dashSize : undefined}
      gapSize={dashed ? gapSize : undefined}
    />
  )
}
