import { useState, useEffect, useRef } from 'react'
import useGraphStore from '../store/useGraphStore'
import useIsMobile from '../lib/useIsMobile'

// ── Layout / style option definitions ─────────────────────────────────────────
const LAYOUT_OPTIONS = [
  { id: 'sphere', label: 'Sphere', icon: '◎' },
  { id: 'cone',   label: 'Cone',   icon: '△' },
]

const NODE_STYLE_OPTIONS = [
  { id: 'polaroid', label: 'Polaroid' },
  { id: 'minimal',  label: 'Minimal'  },
]

const EDGE_STYLE_OPTIONS = [
  { id: 'line', label: 'Line' },
  { id: 'glow', label: 'Glow' },
]

// ── Inline SVG icons ──────────────────────────────────────────────
const PathIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M3 12h18" /><path d="M3 6l6 6-6 6" /><path d="M21 6l-6 6 6 6" />
  </svg>
)
const ShellsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="3" /><circle cx="12" cy="12" r="8" />
  </svg>
)
const EdgesIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="6" cy="6" r="2" /><circle cx="18" cy="18" r="2" /><circle cx="18" cy="6" r="2" />
    <line x1="8" y1="8" x2="16" y2="16" /><line x1="8" y1="6" x2="16" y2="6" />
  </svg>
)
const MoonIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
)
const SunIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
)
const XIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)
const LayoutIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
  </svg>
)

// ── Theme ─────────────────────────────────────────────────────────
function getTheme(isDark) {
  return isDark ? {
    cardBg:        '#1C1A12',
    panelBg:       '#18160F',
    borderNeutral: 'rgba(255,255,255,0.08)',
    text:          '#EDE8E3',
    textMuted:     '#7A6A52',
    shadow:        '0 -2px 24px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.4)',
    itemHoverBg:   'rgba(255,255,255,0.05)',
    inputBg:       '#141210',
    divider:       'rgba(255,255,255,0.08)',
    addRestBg:     '#2A2520',
  } : {
    cardBg:        '#FFFBF4',
    panelBg:       '#FFFFFF',
    borderNeutral: 'rgba(0,0,0,0.08)',
    text:          '#1A0A00',
    textMuted:     '#9A6C3C',
    shadow:        '0 -2px 24px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.10)',
    itemHoverBg:   'rgba(0,0,0,0.03)',
    inputBg:       '#F5F0EA',
    divider:       'rgba(0,0,0,0.08)',
    addRestBg:     '#F5F0EA',
  }
}

function nodeDotColor(node) {
  if (node.isSelf)                         return '#EA580C'
  if (node.isDeceased)                     return '#94A3B8'
  if (node.nodeState === 'claimed')        return '#C2410C'
  if (node.nodeState === 'proxy')          return '#D97706'
  if (node.nodeState === 'invited')        return '#D97706'
  return '#aaaacc'
}

// ── Sub-components ────────────────────────────────────────────────

function NavBtn({ children, onClick, active, label, isDark, isMobile }) {
  const [hovered, setHovered] = useState(false)
  const t = getTheme(isDark)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={isMobile ? label : undefined}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: '3px', padding: isMobile ? '8px' : '8px 10px', borderRadius: '14px',
        background: active
          ? (isDark ? 'rgba(234,88,12,0.15)' : 'rgba(234,88,12,0.08)')
          : hovered ? t.itemHoverBg : 'transparent',
        border: 'none', cursor: 'pointer', fontFamily: 'inherit',
        transition: 'background 0.12s', minWidth: isMobile ? '40px' : '44px',
        flexShrink: 0,
        color: active ? '#EA580C' : t.textMuted,
      }}
    >
      {children}
      {label && !isMobile && (
        <span style={{
          fontSize: '9.5px',
          color: active ? '#EA580C' : t.textMuted,
          letterSpacing: '0.04em', fontWeight: 500, whiteSpace: 'nowrap',
        }}>
          {label}
        </span>
      )}
    </button>
  )
}

function NavDivider({ isDark }) {
  return (
    <div style={{
      width: '1px', height: '24px', flexShrink: 0,
      background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
      margin: '0 4px',
    }} />
  )
}

// ── Main component ────────────────────────────────────────────────

export default function ControlPanel() {
  const [viewOpen, setViewOpen] = useState(false)
  const wrapperRef = useRef(null)

  const nodes             = useGraphStore((s) => s.nodes)
  const selectedNodeId    = useGraphStore((s) => s.selectedNodeId)
  const selectNode        = useGraphStore((s) => s.selectNode)
  const isDark            = useGraphStore((s) => s.isDark)
  const toggleTheme       = useGraphStore((s) => s.toggleTheme)
  const showShells        = useGraphStore((s) => s.showShells)
  const showEdges         = useGraphStore((s) => s.showEdges)
  const toggleShells      = useGraphStore((s) => s.toggleShells)
  const toggleEdges       = useGraphStore((s) => s.toggleEdges)
  const pathMode          = useGraphStore((s) => s.pathMode)
  const togglePathMode    = useGraphStore((s) => s.togglePathMode)
  const currentLayout     = useGraphStore((s) => s.currentLayout)
  const currentNodeStyle  = useGraphStore((s) => s.currentNodeStyle)
  const currentEdgeStyle  = useGraphStore((s) => s.currentEdgeStyle)
  const setLayout         = useGraphStore((s) => s.setLayout)
  const setNodeStyle      = useGraphStore((s) => s.setNodeStyle)
  const setEdgeStyle      = useGraphStore((s) => s.setEdgeStyle)

  const isMobile     = useIsMobile()
  const t            = getTheme(isDark)
  const selectedNode = nodes.find((n) => n.id === selectedNodeId) ?? null

  // Close the view popup on outside click
  useEffect(() => {
    if (!viewOpen) return
    const handler = (e) => {
      if (!wrapperRef.current?.contains(e.target)) {
        setViewOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [viewOpen])

  // Shared style for popup option buttons
  function optionBtnStyle(isActive) {
    return {
      display: 'flex', alignItems: 'center', gap: '6px',
      padding: '7px 10px', borderRadius: '9px',
      border: isActive ? '1px solid rgba(234,88,12,0.40)' : `1px solid ${t.borderNeutral}`,
      background: isActive
        ? (isDark ? 'rgba(234,88,12,0.15)' : 'rgba(234,88,12,0.08)')
        : t.inputBg,
      color: isActive ? '#EA580C' : t.text,
      fontSize: '12px', fontWeight: isActive ? 600 : 400,
      cursor: 'pointer', fontFamily: 'inherit',
      transition: 'background 0.12s, color 0.12s, border-color 0.12s',
      flex: 1, justifyContent: 'center',
    }
  }

  return (
    <div
      ref={wrapperRef}
      style={{
        position: 'fixed',
        bottom: isMobile ? '14px' : '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 20000000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '10px',
        width: isMobile ? 'calc(100vw - 16px)' : 'auto',
        maxWidth: 'calc(100vw - 16px)',
        fontFamily: 'system-ui, sans-serif',
      }}
    >

      {/* ── Selected Node popup ── */}
      {selectedNode && (
        <div style={{
          background: t.panelBg,
          border: `1px solid ${t.borderNeutral}`,
          borderRadius: '16px',
          padding: '12px 14px',
          boxShadow: t.shadow,
          width: 'min(240px, calc(100vw - 24px))',
          display: 'flex', flexDirection: 'column', gap: '8px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{
              margin: 0, fontSize: '10px', color: t.textMuted,
              letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600,
            }}>
              Selected
            </p>
            <button
              onClick={() => selectNode(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.textMuted, padding: '2px', display: 'flex' }}
            >
              <XIcon />
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: nodeDotColor(selectedNode), flexShrink: 0,
            }} />
            <span style={{
              fontSize: '13px', fontWeight: 600, color: t.text,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {selectedNode.fullName}
            </span>
          </div>

          {selectedNode.relationshipToSelf && (
            <p style={{ margin: 0, fontSize: '11px', color: t.textMuted, paddingLeft: '16px' }}>
              {selectedNode.relationshipToSelf}
              {selectedNode.birthYear ? ` · b.${selectedNode.birthYear}` : ''}
            </p>
          )}
        </div>
      )}

      {/* ── View / Style popup ── */}
      {viewOpen && (
        <div style={{
          background: t.panelBg,
          border: `1px solid ${t.borderNeutral}`,
          borderRadius: '16px',
          padding: '14px',
          boxShadow: t.shadow,
          width: 'min(272px, calc(100vw - 24px))',
          boxSizing: 'border-box',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <p style={{
              margin: 0, fontSize: '10px', color: t.textMuted,
              letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600,
            }}>
              View Settings
            </p>
            <button
              onClick={() => setViewOpen(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.textMuted, padding: '2px', display: 'flex' }}
            >
              <XIcon />
            </button>
          </div>

          {/* Layout section */}
          <p style={{
            margin: '0 0 6px 0', fontSize: '9.5px', color: t.textMuted,
            letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600,
          }}>
            Layout
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
            {LAYOUT_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setLayout(opt.id)}
                style={optionBtnStyle(currentLayout === opt.id)}
              >
                <span style={{ fontSize: '14px', lineHeight: 1 }}>{opt.icon}</span>
                {opt.label}
              </button>
            ))}
          </div>

          {/* Node style section */}
          <p style={{
            margin: '0 0 6px 0', fontSize: '9.5px', color: t.textMuted,
            letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600,
          }}>
            Node Style
          </p>
          <div style={{ display: 'flex', gap: '6px', marginBottom: '14px' }}>
            {NODE_STYLE_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setNodeStyle(opt.id)}
                style={optionBtnStyle(currentNodeStyle === opt.id)}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Edge style section */}
          <p style={{
            margin: '0 0 6px 0', fontSize: '9.5px', color: t.textMuted,
            letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600,
          }}>
            Edge Style
          </p>
          <div style={{ display: 'flex', gap: '6px' }}>
            {EDGE_STYLE_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setEdgeStyle(opt.id)}
                style={optionBtnStyle(currentEdgeStyle === opt.id)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Errors are shown centrally via <ErrorModal /> (see App.jsx). */}

      {/* ── Pill navbar ── */}
      <div
        className="cp-pill"
        style={{
          background: t.cardBg,
          border: `1px solid ${t.borderNeutral}`,
          borderRadius: '20px',
          boxShadow: t.shadow,
          display: 'flex', alignItems: 'center',
          padding: isMobile ? '6px' : '6px 8px', gap: '2px',
          maxWidth: '100%',
          // On very narrow screens the row can still exceed the viewport even
          // icon-only, so allow it to scroll horizontally as a safety net.
          overflowX: 'auto',
          overflowY: 'hidden',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
        }}
      >

        {/* Brand */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: '2px', padding: isMobile ? '8px' : '8px 12px', flexShrink: 0,
        }}>
          <span style={{ fontSize: '16px', lineHeight: 1 }}>🌸</span>
          {!isMobile && (
            <span style={{
              fontSize: '9.5px', fontWeight: 600, color: t.text,
              letterSpacing: '0.04em', whiteSpace: 'nowrap',
            }}>
              Khandelwal
            </span>
          )}
        </div>

        <NavDivider isDark={isDark} />

        {/* Path Finder */}
        <NavBtn
          isDark={isDark}
          isMobile={isMobile}
          active={pathMode}
          label="Path"
          onClick={() => { setViewOpen(false); togglePathMode() }}
        >
          <PathIcon />
        </NavBtn>

        {/* View settings */}
        <NavBtn
          isDark={isDark}
          isMobile={isMobile}
          active={viewOpen}
          label="View"
          onClick={() => setViewOpen((v) => !v)}
        >
          <LayoutIcon />
        </NavBtn>

        <NavDivider isDark={isDark} />

        {/* Shells toggle */}
        <NavBtn isDark={isDark} isMobile={isMobile} active={showShells} label="Shells" onClick={toggleShells}>
          <ShellsIcon />
        </NavBtn>

        {/* Edges toggle */}
        <NavBtn isDark={isDark} isMobile={isMobile} active={showEdges} label="Edges" onClick={toggleEdges}>
          <EdgesIcon />
        </NavBtn>

        <NavDivider isDark={isDark} />

        {/* Theme */}
        <NavBtn isDark={isDark} isMobile={isMobile} active={false} label={isDark ? 'Light' : 'Dark'} onClick={toggleTheme}>
          {isDark ? <SunIcon /> : <MoonIcon />}
        </NavBtn>
      </div>
    </div>
  )
}
