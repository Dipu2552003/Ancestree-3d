// ── LayoutGuides.jsx ──────────────────────────────────────────────────────────
// Renders the visual layout scaffolding (shells, rings, lines) inside the
// Three.js Canvas for the currently active layout.
//
// This component does NOT import from useGraphStore.
// It receives layoutId as a prop from Graph.jsx.

import { Line, Html } from '@react-three/drei'
import {
  SHELL_RADII,
  SHELL_LABELS,
} from '../layouts/SphereLayout'
import { GEN_Y_GAP, CONE_RADIUS_PER_GEN, MAX_GEN } from '../layouts/ConeLayout'

// Generation levels shown in the cone layout
const CONE_GENS = [3, 2, 1, 0, -1, -2]
const CONE_GEN_LABELS = {
  3: 'Great-grandparents', 2: 'Grandparents', 1: 'Parents',
  0: 'You', '-1': 'Children', '-2': 'Grandchildren',
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
function SphereGuides() {
  return (
    <>
      {SHELL_RADII.map((r, idx) => {
        const isSelf = idx === 3
        const color  = isSelf ? '#EA580C' : 'white'
        const op     = isSelf ? 0.22 : 0.08
        const lw     = isSelf ? 1.0 : 0.5
        return (
          <group key={r}>
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
                {SHELL_LABELS[idx]}
              </span>
            </Html>
          </group>
        )
      })}
    </>
  )
}

// ── ConeGuides ────────────────────────────────────────────────────────────────
// Rings mirror the actual cone shape: small at top (oldest ancestors),
// progressively wider going down to descendants.
function ConeGuides() {
  return (
    <>
      {CONE_GENS.map((gen) => {
        const y      = gen * GEN_Y_GAP
        const r      = Math.max(CONE_RADIUS_PER_GEN, (MAX_GEN + 1 - gen) * CONE_RADIUS_PER_GEN)
        const isSelf = gen === 0
        const label  = CONE_GEN_LABELS[gen] ?? ''

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
export default function LayoutGuides({ layoutId }) {
  switch (layoutId) {
    case 'cone':   return <ConeGuides />
    case 'sphere':
    default:       return <SphereGuides />
  }
}
