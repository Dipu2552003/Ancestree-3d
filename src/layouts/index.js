// ── layouts/index.js ──────────────────────────────────────────────────────────
// Central registry for all layout strategies.
// Import getLayout anywhere to retrieve a layout by id.
// DO NOT import from useGraphStore here — this is a pure data module.

import SphereLayout from './SphereLayout'
import ConeLayout   from './ConeLayout'
import ForceLayout  from './ForceLayout'
import TreeLayout   from './TreeLayout'
import HelixLayout  from './HelixLayout'

const LAYOUTS = {
  sphere: SphereLayout,
  cone:   ConeLayout,
  force:  ForceLayout,
  tree:   TreeLayout,
  helix:  HelixLayout,
}

export function getLayout(id) {
  return LAYOUTS[id] ?? SphereLayout
}

export { SphereLayout, ConeLayout, ForceLayout, TreeLayout, HelixLayout }
export default LAYOUTS
