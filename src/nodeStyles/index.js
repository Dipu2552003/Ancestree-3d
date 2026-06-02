// ── nodeStyles/index.js ───────────────────────────────────────────────────────
// Central registry for node style components.

import PolaroidStyle from './PolaroidStyle'
import MinimalStyle  from './MinimalStyle'

const NODE_STYLES = {
  polaroid: PolaroidStyle,
  minimal:  MinimalStyle,
}

export function getNodeStyle(id) {
  return NODE_STYLES[id] ?? PolaroidStyle
}

export { PolaroidStyle, MinimalStyle }
export default NODE_STYLES
