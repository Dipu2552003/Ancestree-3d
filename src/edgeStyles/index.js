// ── edgeStyles/index.js ───────────────────────────────────────────────────────
// Central registry for edge style components.

import LineStyle from './LineStyle'
import GlowStyle from './GlowStyle'

const EDGE_STYLES = {
  line: LineStyle,
  glow: GlowStyle,
}

export function getEdgeStyle(id) {
  return EDGE_STYLES[id] ?? LineStyle
}

export { LineStyle, GlowStyle }
export default EDGE_STYLES
