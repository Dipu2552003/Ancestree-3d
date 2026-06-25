import { useState, useEffect, useRef } from 'react'
import useGraphStore from '../store/useGraphStore'
import useIsMobile from '../lib/useIsMobile'

// drei's <Html> nodes render with a very high z-index (up to ~16.7M), so the
// panel must sit above that range to stay in front of the 3D node cards.
const Z_ABOVE_NODES = 20000000

const START_COLOR = '#22C55E'
const END_COLOR   = '#3B82F6'

export default function PathPanel() {
  const nodes         = useGraphStore((s) => s.nodes)
  const pathMode      = useGraphStore((s) => s.pathMode)
  const pathSource    = useGraphStore((s) => s.pathSource)
  const pathTarget    = useGraphStore((s) => s.pathTarget)
  const pathResults   = useGraphStore((s) => s.pathResults)
  const setPathSource = useGraphStore((s) => s.setPathSource)
  const setPathTarget = useGraphStore((s) => s.setPathTarget)
  const clearPaths    = useGraphStore((s) => s.clearPaths)
  const togglePathMode = useGraphStore((s) => s.togglePathMode)
  const isDark        = useGraphStore((s) => s.isDark)
  const isMobile      = useIsMobile()

  if (!pathMode) return null

  const nameOf  = (id) => nodes.find((n) => n.id === id)?.label ?? id
  const shortest = pathResults[0] ?? null

  const t = {
    panelBg:    isDark ? 'rgba(10,10,20,0.94)'  : 'rgba(255,247,237,0.97)',
    border:     isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.10)',
    text:       isDark ? '#EDE8E3' : '#1A0A00',
    sub:        isDark ? 'rgba(237,232,227,0.45)' : 'rgba(26,10,0,0.45)',
    inputBg:    isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
    fieldBorder: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)',
    rowHover:   isDark ? 'rgba(108,99,255,0.22)' : 'rgba(234,88,12,0.10)',
    arrow:      isDark ? '#8A7060' : '#D97706',
    pathBg:     isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
  }

  // Desktop: top-right column. Mobile: bottom sheet above the control pill.
  const base = {
    zIndex: Z_ABOVE_NODES,
    display: 'flex', flexDirection: 'column',
    background: t.panelBg, backdropFilter: 'blur(12px)',
    border: t.border,
    fontFamily: 'system-ui, sans-serif',
    overflow: 'hidden',
  }
  const containerStyle = isMobile
    ? { ...base, position: 'fixed', left: 8, right: 8, bottom: 86, maxHeight: '52vh', borderRadius: 14,
        boxShadow: isDark ? '0 8px 30px rgba(0,0,0,0.5)' : '0 8px 30px rgba(0,0,0,0.15)' }
    : { ...base, position: 'fixed', top: 24, right: 20, width: 300, maxHeight: 'calc(100vh - 48px)', borderRadius: 12 }

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={{
        padding: '12px 14px 10px', borderBottom: t.border,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexShrink: 0,
      }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#EA580C' }}>
            Find Connection
          </p>
          <p style={{ margin: '3px 0 0', fontSize: 11, color: t.sub }}>
            Pick two people to see how they connect
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
          {(pathSource || pathTarget) && (
            <button onClick={clearPaths} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: t.sub, fontSize: 11, padding: '4px 8px', borderRadius: 6,
            }}>
              Reset
            </button>
          )}
          <button onClick={togglePathMode} aria-label="Close" style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: t.sub, padding: '4px 6px', borderRadius: 6,
            display: 'flex', alignItems: 'center', lineHeight: 0,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ overflowY: 'auto', padding: '12px 14px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <NodePicker
          step={1} label="Start person" accent={START_COLOR}
          selectedId={pathSource} otherId={pathTarget}
          nodes={nodes} theme={t}
          onSelect={setPathSource}
        />
        <NodePicker
          step={2} label="End person" accent={END_COLOR}
          selectedId={pathTarget} otherId={pathSource}
          nodes={nodes} theme={t}
          onSelect={setPathTarget}
        />

        {/* Result */}
        {pathSource && pathTarget && !shortest && (
          <p style={{ margin: '2px 0 0', fontSize: 12, color: t.sub, textAlign: 'center', padding: '8px 0' }}>
            No connection found between them
          </p>
        )}

        {shortest && (
          <div style={{ marginTop: 2 }}>
            <p style={{ margin: '0 0 6px', fontSize: 10, color: t.sub, letterSpacing: '0.06em' }}>
              Shortest connection · {shortest.length - 1} step{shortest.length - 1 !== 1 ? 's' : ''}
            </p>
            <div style={{ background: t.pathBg, border: `1px solid ${t.fieldBorder}`, borderRadius: 10, padding: '10px 12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {shortest.map((id, idx) => (
                  <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {idx > 0 && <span style={{ fontSize: 10, color: t.arrow, paddingLeft: 8 }}>↓</span>}
                    <span style={{
                      fontSize: idx === 0 || idx === shortest.length - 1 ? 13 : 12,
                      fontWeight: idx === 0 || idx === shortest.length - 1 ? 600 : 400,
                      color: idx === 0 ? START_COLOR : idx === shortest.length - 1 ? END_COLOR : t.text,
                      paddingLeft: idx > 0 ? 14 : 0,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {nameOf(id)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Searchable node picker ────────────────────────────────────────────────────
// Shows a search box; focusing it lists every node (filtered as you type).
// Picking one sets that endpoint. Once chosen it shows the name as a chip with
// a clear button so you can swap the person out.
function NodePicker({ step, label, accent, selectedId, otherId, nodes, theme, onSelect }) {
  const [query, setQuery]     = useState('')
  const [editing, setEditing] = useState(false)
  const ref = useRef(null)

  const selectedNode = nodes.find((n) => n.id === selectedId) ?? null
  const selected     = selectedNode ? selectedNode.label : null

  useEffect(() => {
    if (!editing) return
    const h = (e) => { if (!ref.current?.contains(e.target)) { setEditing(false); setQuery('') } }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [editing])

  const q = query.trim().toLowerCase()
  const results = nodes
    .filter((n) => n.id !== otherId)
    .filter((n) => !q || (n.label ?? '').toLowerCase().includes(q))
    .slice(0, 60)

  function pick(id) {
    onSelect(id)
    setEditing(false)
    setQuery('')
  }

  const stepBadge = (
    <span style={{
      width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
      background: accent, color: '#fff', fontSize: 9, fontWeight: 700,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>{step}</span>
  )

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <p style={{ margin: '0 0 4px', fontSize: 10, color: theme.sub, letterSpacing: '0.05em', textTransform: 'uppercase', fontWeight: 600 }}>
        {label}
      </p>

      {selected && !editing ? (
        // Chosen chip
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '8px 10px', borderRadius: 9,
          background: theme.inputBg, border: `1px solid ${accent}`,
        }}>
          {selectedNode && <NodeAvatar node={selectedNode} size={30} ring={accent} />}
          <span style={{
            flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, color: theme.text,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{selected}</span>
          <button onClick={() => { setEditing(true); setQuery('') }} title="Change" style={{
            background: 'none', border: 'none', cursor: 'pointer', color: theme.sub, fontSize: 11, padding: '2px 4px',
          }}>Change</button>
        </div>
      ) : (
        // Search input
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 9, background: theme.inputBg, border: `1px solid ${theme.fieldBorder}` }}>
          {stepBadge}
          <input
            autoFocus={editing}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setEditing(true)}
            placeholder={`Search to select…`}
            style={{
              flex: 1, minWidth: 0, background: 'transparent', border: 'none', outline: 'none',
              color: theme.text, fontSize: 13, fontFamily: 'inherit',
            }}
          />
        </div>
      )}

      {/* Dropdown */}
      {editing && (
        <ul style={{
          position: 'absolute', left: 0, right: 0, top: '100%', marginTop: 4, zIndex: 5,
          listStyle: 'none', padding: '4px 0', maxHeight: 220, overflowY: 'auto',
          background: theme.panelBg, backdropFilter: 'blur(12px)',
          border: theme.border, borderRadius: 9,
          boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
        }}>
          {results.length === 0 && (
            <li style={{ padding: '8px 12px', fontSize: 12, color: theme.sub }}>No matches</li>
          )}
          {results.map((n) => {
            const meta = nodeMeta(n)
            return (
              <li
                key={n.id}
                onMouseDown={(e) => { e.preventDefault(); pick(n.id) }}
                onMouseEnter={(e) => (e.currentTarget.style.background = theme.rowHover)}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', cursor: 'pointer',
                }}
              >
                <NodeAvatar node={n} size={30} ring={theme.fieldBorder} />
                <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: theme.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {n.label}
                  </span>
                  {meta && (
                    <span style={{ fontSize: 11, color: theme.sub, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {meta}
                    </span>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

// ── Avatar + meta helpers (mirrors the frontend search rows) ──────────────────
function getInitials(name) {
  const parts = (name ?? '').trim().split(/\s+/)
  if (parts.length === 1) return (parts[0] || '?').slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

// Photo if available, otherwise an initials circle tinted by the node's colour.
function NodeAvatar({ node, size = 28, ring }) {
  const common = {
    width: size, height: size, borderRadius: '50%', flexShrink: 0,
    border: ring ? `1.5px solid ${ring}` : 'none', objectFit: 'cover', display: 'block',
  }
  if (node.photoUrl) {
    return <img src={node.photoUrl} alt="" style={common} />
  }
  return (
    <div style={{
      ...common,
      background: node.color ?? '#aaaacc', color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: Math.round(size * 0.38), fontWeight: 600, letterSpacing: '0.02em',
    }}>
      {getInitials(node.label ?? node.fullName)}
    </div>
  )
}

// Small secondary line: relationship-to-self and birth year, when present.
function nodeMeta(node) {
  const bits = []
  if (node.isSelf) bits.push('You')
  else if (node.relationshipToSelf) bits.push(node.relationshipToSelf)
  if (node.birthYear) bits.push(`b. ${node.birthYear}`)
  return bits.join(' · ')
}
