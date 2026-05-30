import { useState } from 'react'
import useGraphStore from '../store/useGraphStore'

const CATEGORIES = ['concept', 'memory', 'skill', 'fact', 'idea']

const ORBIT_SHELLS = [
  { label: 'Inner',  radius: 120 },
  { label: 'Middle', radius: 220 },
  { label: 'Outer',  radius: 320 },
]

const CATEGORY_COLORS = {
  concept: '#6c63ff',
  memory:  '#ff6584',
  skill:   '#43d9ad',
  fact:    '#ffb347',
  idea:    '#f9a8d4',
}

export default function ControlPanel() {
  const [label,    setLabel]    = useState('')
  const [category, setCategory] = useState('concept')
  const [shell,    setShell]    = useState(0)

  const nodes          = useGraphStore((s) => s.nodes)
  const addNode        = useGraphStore((s) => s.addNode)
  const removeNode     = useGraphStore((s) => s.removeNode)
  const connectMode    = useGraphStore((s) => s.connectMode)
  const toggleConnectMode = useGraphStore((s) => s.toggleConnectMode)
  const pendingConnectId  = useGraphStore((s) => s.pendingConnectId)
  const selectedNodeId    = useGraphStore((s) => s.selectedNodeId)

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) ?? null

  function handleAdd() {
    const trimmed = label.trim()
    if (!trimmed) return
    addNode(trimmed, category, ORBIT_SHELLS[shell].radius)
    setLabel('')
  }

  return (
    <div style={s.panel}>

      {/* ── Add Node ── */}
      <section style={s.section}>
        <p style={s.heading}>Add Node</p>

        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="Node label…"
          style={s.input}
        />

        <div style={s.row}>
          <select value={category} onChange={(e) => setCategory(e.target.value)} style={s.select}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select value={shell} onChange={(e) => setShell(Number(e.target.value))} style={s.select}>
            {ORBIT_SHELLS.map((sh, i) => (
              <option key={sh.label} value={i}>{sh.label}</option>
            ))}
          </select>
        </div>

        <button
          onClick={handleAdd}
          disabled={!label.trim()}
          style={{ ...s.btn, ...(label.trim() ? s.btnPrimary : s.btnDisabled) }}
        >
          + Add Node
        </button>
      </section>

      <div style={s.divider} />

      {/* ── Connect Mode ── */}
      <section style={s.section}>
        <button
          onClick={toggleConnectMode}
          style={{ ...s.btn, ...(connectMode ? s.btnAccent : s.btnSecondary) }}
        >
          Connect Mode: {connectMode ? 'ON' : 'OFF'}
        </button>

        {connectMode && (
          <p style={s.hint}>
            {pendingConnectId
              ? '→ Click target node to connect'
              : 'Click source node'}
          </p>
        )}
      </section>

      {/* ── Selected Node ── */}
      {selectedNode && (
        <>
          <div style={s.divider} />
          <section style={s.section}>
            <p style={s.heading}>Selected</p>
            <div style={s.card}>
              <div style={s.cardRow}>
                <span
                  style={{
                    ...s.dot,
                    background: CATEGORY_COLORS[selectedNode.category] ?? '#aaa',
                  }}
                />
                <span style={s.cardLabel}>{selectedNode.label}</span>
              </div>
              <p style={s.cardMeta}>
                {selectedNode.category} &nbsp;·&nbsp; r = {selectedNode.orbitRadius}
              </p>
            </div>
            <button
              onClick={() => removeNode(selectedNode.id)}
              style={{ ...s.btn, ...s.btnDanger }}
            >
              Delete Node
            </button>
          </section>
        </>
      )}
    </div>
  )
}

const s = {
  panel: {
    position: 'fixed',
    bottom: 24,
    left: 20,
    zIndex: 100,
    width: 220,
    background: 'rgba(10,10,20,0.85)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: '14px 14px',
    fontFamily: 'system-ui, sans-serif',
    color: '#fff',
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    padding: '10px 0',
  },
  divider: {
    height: 1,
    background: 'rgba(255,255,255,0.07)',
    margin: '0 -14px',
  },
  heading: {
    margin: 0,
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.4)',
  },
  input: {
    padding: '7px 10px',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 7,
    color: '#fff',
    fontSize: 13,
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  },
  row: {
    display: 'flex',
    gap: 6,
  },
  select: {
    flex: 1,
    padding: '6px 8px',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 7,
    color: '#fff',
    fontSize: 12,
    outline: 'none',
    cursor: 'pointer',
  },
  btn: {
    width: '100%',
    padding: '8px 0',
    borderRadius: 7,
    border: 'none',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'opacity 0.15s',
  },
  btnPrimary: {
    background: '#6c63ff',
    color: '#fff',
  },
  btnDisabled: {
    background: 'rgba(255,255,255,0.07)',
    color: 'rgba(255,255,255,0.3)',
    cursor: 'default',
  },
  btnSecondary: {
    background: 'rgba(255,255,255,0.08)',
    color: 'rgba(255,255,255,0.7)',
  },
  btnAccent: {
    background: '#6c63ff',
    color: '#fff',
    boxShadow: '0 0 12px rgba(108,99,255,0.5)',
  },
  btnDanger: {
    background: 'rgba(239,68,68,0.2)',
    color: '#f87171',
    border: '1px solid rgba(239,68,68,0.3)',
    marginTop: 2,
  },
  hint: {
    margin: 0,
    fontSize: 11,
    color: 'rgba(255,255,255,0.45)',
    textAlign: 'center',
  },
  card: {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 8,
    padding: '8px 10px',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  cardRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    flexShrink: 0,
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: 600,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  cardMeta: {
    margin: 0,
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    paddingLeft: 16,
  },
}
