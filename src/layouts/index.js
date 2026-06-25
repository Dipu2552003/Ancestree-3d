// ── layouts/index.js ──────────────────────────────────────────────────────────
// Central registry for all layout strategies.
// Import getLayout anywhere to retrieve a layout by id.
// DO NOT import from useGraphStore here — this is a pure data module.

import SphereLayout from './SphereLayout'
import ConeLayout   from './ConeLayout'

const LAYOUTS = {
  sphere: SphereLayout,
  cone:   ConeLayout,
}

export function getLayout(id) {
  return LAYOUTS[id] ?? ConeLayout
}

export { SphereLayout, ConeLayout }
export default LAYOUTS
