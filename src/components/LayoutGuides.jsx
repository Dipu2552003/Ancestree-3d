// ── LayoutGuides.jsx ──────────────────────────────────────────────────────────
// Renders the visual layout scaffolding (shells, rings, lines) inside the
// Three.js Canvas for the currently active layout.
//
// This component does NOT import from useGraphStore.
// It receives layoutId as a prop from Graph.jsx.

import { Line, Html } from '@react-three/drei'

// Labels for the generation rings/shells, keyed by generation number.
const GEN_LABELS = {
  3: 'Great-grandparents', 2: 'Grandparents', 1: 'Parents',
  0: 'You', '-1': 'Children', '-2': 'Grandchildren', '-3': 'Great-grandchildren',
}

// ── Helper: build a flat horizontal circle (XZ plane) at given y and radius ──
function circlePointsXZ(r, y, segments = 128) {
  return Array.from({ length: segments + 1 }, (_, i) => {
    const t = (i / segments) * Math.PI * 2
    return [r * Math.cos(t), y, r * Math.sin(t)]
  })
}

// ── Helper: 3 great circles (equator + 2 meridians) for a sphere shell ────────
function shellCircles(r) {
  const pts = (fn) => Array.from({ length: 129 }, (_, i) => fn((i / 128) * Math.PI * 2))
  return [
    pts((t) => [r * Math.cos(t), 0,              r * Math.sin(t)]),
    pts((t) => [r * Math.cos(t), r * Math.sin(t), 0             ]),
    pts((t) => [0,               r * Math.sin(t), r * Math.cos(t)]),
  ]
}

// ── SphereGuides ───────────────────────────────────────────────────────────────
// Shells are passed in from Graph.jsx, derived from the actual nodes, so each
// drawn shell matches the population-sized radius its generation sits on.
function SphereGuides({ shells = [] }) {
  return (
    <>
      {shells.map(({ gen, r }) => {
        const isSelf = gen === 0
        const color  = isSelf ? '#EA580C' : 'white'
        const op     = isSelf ? 0.22 : 0.08
        const lw     = isSelf ? 1.0 : 0.5
        const label  = GEN_LABELS[gen] ?? ''
        return (
          <group key={gen}>
            {shellCircles(r).map((pts, ci) => (
              <Line key={ci} points={pts} color={color} lineWidth={lw} transparent opacity={op} />
            ))}
            <Html position={[r + 16, 0, 0]} center>
              <span style={{
                color: isSelf ? '#EA580C' : 'rgba(255,255,255,0.3)',
                fontSize: 9,
                whiteSpace: 'nowrap',
                pointerEvents: 'none',
                fontFamily: 'system-ui, sans-serif',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}>
                {label}
              </span>
            </Html>
          </group>
        )
      })}
    </>
  )
}

// ── ConeGuides ────────────────────────────────────────────────────────────────
// Rings are passed in from Graph.jsx, derived from the actual nodes, so each
// guide circle matches the population-sized ring its generation sits on.
function ConeGuides({ rings = [] }) {
  return (
    <>
      {rings.map(({ gen, y, r }) => {
        const isSelf = gen === 0
        const label  = GEN_LABELS[gen] ?? ''

        return (
          <group key={gen}>
            <Line
              points={circlePointsXZ(r, y)}
              color={isSelf ? '#EA580C' : 'white'}
              lineWidth={isSelf ? 1.0 : 0.5}
              transparent
              opacity={isSelf ? 0.22 : 0.09}
            />
            <Html position={[r + 16, y, 0]} center>
              <span style={{
                color: isSelf ? '#EA580C' : 'rgba(255,255,255,0.3)',
                fontSize: 9,
                whiteSpace: 'nowrap',
                pointerEvents: 'none',
                fontFamily: 'system-ui, sans-serif',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}>
                {label}
              </span>
            </Html>
          </group>
        )
      })}
    </>
  )
}

// ── LayoutGuides (main export) ────────────────────────────────────────────────
export default function LayoutGuides({ layoutId, coneRings = [], sphereShells = [] }) {
  switch (layoutId) {
    case 'cone':   return <ConeGuides rings={coneRings} />
    case 'sphere':
    default:       return <SphereGuides shells={sphereShells} />
  }
}
