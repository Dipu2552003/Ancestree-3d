import { useState } from 'react'
import useGraphStore from '../store/useGraphStore'
import useIsMobile from '../lib/useIsMobile'

// drei's <Html> nodes render with a very high z-index (up to ~16.7M), so the
// panel must sit above that range to stay in front of the 3D node cards.
const Z_ABOVE_NODES = 20000000

const START_COLOR = '#22C55E'
const END_COLOR   = '#3B82F6'

export default function PathPanel() {
  const nodes          = useGraphStore((s) => s.nodes)
  const pathMode       = useGraphStore((s) => s.pathMode)
  const pathSource     = useGraphStore((s) => s.pathSource)
  const pathTarget     = useGraphStore((s) => s.pathTarget)
  const pathResults    = useGraphStore((s) => s.pathResults)
  const setPathSource  = useGraphStore((s) => s.setPathSource)
  const setPathTarget  = useGraphStore((s) => s.setPathTarget)
  const clearPaths     = useGraphStore((s) => s.clearPaths)
  const togglePathMode = useGraphStore((s) => s.togglePathMode)
  const isDark         = useGraphStore((s) => s.isDark)
  const isMobile       = useIsMobile()

  // Collapse the result into a single "name1 → name2" row so the graph is free
  // to explore; tapping the row expands the full shortest-connection list again.
  const [minimized, setMinimized] = useState(false)

  if (!pathMode) return null

  const nameOf      = (id) => nodes.find((n) => n.id === id)?.label ?? id
  const sourceNode  = nodes.find((n) => n.id === pathSource) ?? null
  const targetNode  = nodes.find((n) => n.id === pathTarget) ?? null
  const shortest    = pathResults[0] ?? null

  const t = {
    panelBg:     isDark ? 'rgba(13,13,22,0.96)'  : 'rgba(255,250,244,0.98)',
    border:      isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)',
    text:        isDark ? '#EDE8E3' : '#1A0A00',
    sub:         isDark ? 'rgba(237,232,227,0.45)' : 'rgba(26,10,0,0.45)',
    inputBg:     isDark ? 'rgba(255,255,255,0.05)' : '#FFFFFF',
    fieldBorder: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)',
    rowHover:    isDark ? 'rgba(255,255,255,0.06)' : 'rgba(234,88,12,0.07)',
    arrow:       isDark ? '#8A7060' : '#C2843C',
    listBg:      isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)',
  }

  // Step in the flow: 1 = pick start, 2 = pick end, 3 = done.
  const step = !pathSource ? 1 : !pathTarget ? 2 : 3
  const stepHint =
    step === 1 ? 'Step 1 of 2 — choose the first person'
    : step === 2 ? 'Step 2 of 2 — choose the second person'
    : 'Connection found'

  const base = {
    zIndex: Z_ABOVE_NODES,
    display: 'flex', flexDirection: 'column',
    background: t.panelBg, backdropFilter: 'blur(14px)',
    border: t.border, fontFamily: 'system-ui, sans-serif', overflow: 'hidden',
  }
  const containerStyle = isMobile
    ? { ...base, position: 'fixed', left: 8, right: 8, bottom: 86, maxHeight: '56vh', borderRadius: 16,
        boxShadow: isDark ? '0 10px 34px rgba(0,0,0,0.55)' : '0 10px 34px rgba(0,0,0,0.16)' }
    : { ...base, position: 'fixed', top: 24, right: 20, width: 312, maxHeight: 'calc(100vh - 48px)', borderRadius: 14,
        boxShadow: isDark ? '0 10px 34px rgba(0,0,0,0.5)' : '0 10px 30px rgba(0,0,0,0.12)' }

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={{
        padding: '13px 15px 11px', borderBottom: t.border,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, flexShrink: 0,
      }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 10.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#EA580C' }}>
            Find Connection
          </p>
          <p style={{ margin: '4px 0 0', fontSize: 11.5, color: t.sub }}>{stepHint}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
          {/* Minimize / expand — mobile only, once both people are chosen */}
          {isMobile && step === 3 && (
            <button onClick={() => setMinimized((m) => !m)} aria-label={minimized ? 'Expand' : 'Minimize'} style={{
              background: 'none', border: 'none', cursor: 'pointer', color: t.sub, padding: '4px 6px', borderRadius: 6,
              display: 'flex', alignItems: 'center', lineHeight: 0,
            }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"
                style={{ transform: minimized ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform 0.15s' }}>
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
          )}
          {(pathSource || pathTarget) && (
            <button onClick={clearPaths} style={{
              background: 'none', border: 'none', cursor: 'pointer', color: t.sub, fontSize: 11, padding: '4px 8px', borderRadius: 6,
            }}>Reset</button>
          )}
          <button onClick={togglePathMode} aria-label="Close" style={{
            background: 'none', border: 'none', cursor: 'pointer', color: t.sub, padding: '4px 6px', borderRadius: 6,
            display: 'flex', alignItems: 'center', lineHeight: 0,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ overflowY: 'auto', padding: '14px 15px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {isMobile && step === 3 ? (
          /* ── Mobile, both chosen: compact "name1 → name2" summary that the
                header (or this row) can collapse so the graph stays explorable ── */
          <>
            <button
              onClick={() => setMinimized((m) => !m)}
              aria-label={minimized ? 'Expand connection' : 'Minimize'}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                padding: '10px 11px', borderRadius: 11, cursor: 'pointer',
                background: t.inputBg, border: t.border, fontFamily: 'inherit',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, flex: 1 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: START_COLOR, flexShrink: 0 }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {sourceNode?.label ?? nameOf(pathSource)}
                </span>
              </span>
              <span style={{ color: t.arrow, fontSize: 13, flexShrink: 0 }}>→</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, flex: 1, justifyContent: 'flex-end' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: END_COLOR, flexShrink: 0 }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {targetNode?.label ?? nameOf(pathTarget)}
                </span>
              </span>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={t.sub} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"
                style={{ flexShrink: 0, transform: minimized ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform 0.15s' }}>
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {!minimized && !shortest && (
              <p style={{ margin: 0, fontSize: 12, color: t.sub, textAlign: 'center', padding: '6px 0' }}>
                No connection found between them
              </p>
            )}
            {!minimized && shortest && <ConnectionList shortest={shortest} nameOf={nameOf} theme={t} />}
          </>
        ) : (
          /* ── Desktop (and the picking steps): full cards + connection list ── */
          <>
            {/* Start slot */}
            {sourceNode
              ? <SelectedSlot node={sourceNode} accent={START_COLOR} label="From" theme={t} onChange={() => setPathSource(null)} />
              : <PersonSearch  accent={START_COLOR} placeholder="Search the first person…" nodes={nodes} excludeId={pathTarget} theme={t} onSelect={setPathSource} />
            }

            {/* End slot — revealed once the first is chosen (kept visible if it
                was already set while re-choosing the first) */}
            {(pathSource || pathTarget) && (
              targetNode
                ? <SelectedSlot node={targetNode} accent={END_COLOR} label="To" theme={t} onChange={() => setPathTarget(null)} />
                : <PersonSearch  accent={END_COLOR} placeholder="Search the second person…" nodes={nodes} excludeId={pathSource} theme={t} onSelect={setPathTarget} autoFocus />
            )}

            {/* Result */}
            {pathSource && pathTarget && !shortest && (
              <p style={{ margin: 0, fontSize: 12, color: t.sub, textAlign: 'center', padding: '6px 0' }}>
                No connection found between them
              </p>
            )}
            {shortest && (
              <div>
                <div style={{ height: 1, background: t.fieldBorder, opacity: 0.6, margin: '0 0 10px' }} />
                <ConnectionList shortest={shortest} nameOf={nameOf} theme={t} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ── A confirmed person (compact row with a Change action) ─────────────────────
function SelectedSlot({ node, accent, label, theme, onChange }) {
  const meta = nodeMeta(node)
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 11,
      padding: '9px 11px', borderRadius: 11,
      background: theme.inputBg, border: `1px solid ${accent}`,
    }}>
      <NodeAvatar node={node} size={34} ring={accent} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: accent }}>{label}</span>
        </div>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: theme.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {node.label}
        </div>
        {meta && <div style={{ fontSize: 11, color: theme.sub, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{meta}</div>}
      </div>
      <button onClick={onChange} title="Change" style={{
        background: 'none', border: 'none', cursor: 'pointer', color: theme.sub, fontSize: 11, fontWeight: 500, padding: '4px 6px', borderRadius: 6, flexShrink: 0,
      }}>Change</button>
    </div>
  )
}

// ── Active search: input + inline, scrollable results list ────────────────────
function PersonSearch({ accent, placeholder, nodes, excludeId, theme, onSelect, autoFocus }) {
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const results = nodes
    .filter((n) => n.id !== excludeId)
    .filter((n) => !q || (n.label ?? '').toLowerCase().includes(q))
    .slice(0, 60)

  return (
    <div>
      {/* Input */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 9, padding: '9px 11px', borderRadius: 11,
        background: theme.inputBg, border: `1.5px solid ${accent}`,
      }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.2" strokeLinecap="round" style={{ flexShrink: 0 }}>
          <circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          autoFocus={autoFocus}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          style={{ flex: 1, minWidth: 0, background: 'transparent', border: 'none', outline: 'none', color: theme.text, fontSize: 13, fontFamily: 'inherit' }}
        />
      </div>

      {/* Results */}
      <div style={{
        marginTop: 7, borderRadius: 11, overflow: 'hidden',
        border: `1px solid ${theme.fieldBorder}`, background: theme.listBg,
        maxHeight: 248, overflowY: 'auto',
      }}>
        {results.length === 0 && (
          <p style={{ margin: 0, padding: '12px', fontSize: 12, color: theme.sub, textAlign: 'center' }}>No matches</p>
        )}
        {results.map((n, i) => {
          const meta = nodeMeta(n)
          return (
            <div
              key={n.id}
              onClick={() => onSelect(n.id)}
              onMouseEnter={(e) => (e.currentTarget.style.background = theme.rowHover)}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              style={{
                display: 'flex', alignItems: 'center', gap: 11, padding: '9px 11px', cursor: 'pointer',
                borderTop: i === 0 ? 'none' : `1px solid ${theme.fieldBorder}`, transition: 'background 0.1s',
              }}
            >
              <NodeAvatar node={n} size={32} ring={theme.fieldBorder} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: theme.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {n.label}
                </div>
                {meta && <div style={{ fontSize: 11, color: theme.sub, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{meta}</div>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Shortest-connection list ──────────────────────────────────────────────────
function ConnectionList({ shortest, nameOf, theme }) {
  return (
    <>
      <p style={{ margin: '0 0 8px', fontSize: 10.5, color: theme.sub, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>
        Shortest connection · {shortest.length - 1} step{shortest.length - 1 !== 1 ? 's' : ''}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {shortest.map((id, idx) => (
          <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {idx > 0 && <span style={{ fontSize: 11, color: theme.arrow, paddingLeft: 9 }}>↓</span>}
            <span style={{
              fontSize: idx === 0 || idx === shortest.length - 1 ? 13 : 12,
              fontWeight: idx === 0 || idx === shortest.length - 1 ? 600 : 400,
              color: idx === 0 ? START_COLOR : idx === shortest.length - 1 ? END_COLOR : theme.text,
              paddingLeft: idx > 0 ? 15 : 0,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {nameOf(id)}
            </span>
          </div>
        ))}
      </div>
    </>
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
