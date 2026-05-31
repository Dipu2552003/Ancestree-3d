import { useState } from 'react'
import useGraphStore from '../store/useGraphStore'

const ORBIT_SHELLS = [
  { label: 'Parents gen',  orbitRadius: 240 },
  { label: 'My gen',       orbitRadius: 320 },
  { label: 'Children gen', orbitRadius: 400 },
]

const REL_TYPES = ['PARENT_OF', 'SPOUSE_OF', 'SIBLING_OF']

const NODE_COLOR = {
  self:     '#EA580C',
  deceased: '#94A3B8',
  claimed:  '#6c63ff',
  invited:  '#ffd93d',
  proxy:    '#aaaacc',
}

function dotColor(node) {
  if (node.isSelf)     return NODE_COLOR.self
  if (node.isDeceased) return NODE_COLOR.deceased
  return NODE_COLOR[node.nodeState] ?? NODE_COLOR.proxy
}

export default function ControlPanel() {
  const [name,  setName]  = useState('')
  const [shell, setShell] = useState(1)  // default: Middle

  const nodes            = useGraphStore((s) => s.nodes)
  const addNode          = useGraphStore((s) => s.addNode)
  const removeNode       = useGraphStore((s) => s.removeNode)
  const connectMode      = useGraphStore((s) => s.connectMode)
  const toggleConnectMode = useGraphStore((s) => s.toggleConnectMode)
  const pendingConnectId  = useGraphStore((s) => s.pendingConnectId)
  const pendingRelType    = useGraphStore((s) => s.pendingRelType)
  const setPendingRelType = useGraphStore((s) => s.setPendingRelType)
  const selectedNodeId    = useGraphStore((s) => s.selectedNodeId)
  const logout            = useGraphStore((s) => s.logout)
  const error             = useGraphStore((s) => s.error)
  const isDark            = useGraphStore((s) => s.isDark)
  const toggleTheme       = useGraphStore((s) => s.toggleTheme)
  const showShells        = useGraphStore((s) => s.showShells)
  const showEdges         = useGraphStore((s) => s.showEdges)
  const toggleShells      = useGraphStore((s) => s.toggleShells)
  const toggleEdges       = useGraphStore((s) => s.toggleEdges)
  const pathMode          = useGraphStore((s) => s.pathMode)
  const togglePathMode    = useGraphStore((s) => s.togglePathMode)

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) ?? null

  async function handleAdd() {
    const trimmed = name.trim()
    if (!trimmed) return
    await addNode(trimmed, ORBIT_SHELLS[shell].orbitRadius)
    setName('')
  }

  return (
    <div style={s.panel}>

      {/* ── Add Person ── */}
      <section style={s.section}>
        <p style={s.heading}>Add Person</p>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="Full name…"
          style={s.input}
        />
        <select
          value={shell}
          onChange={(e) => setShell(Number(e.target.value))}
          style={s.select}
        >
          {ORBIT_SHELLS.map((sh, i) => (
            <option key={sh.label} value={i}>{sh.label} shell</option>
          ))}
        </select>
        <button
          onClick={handleAdd}
          disabled={!name.trim()}
          style={{ ...s.btn, ...(name.trim() ? s.btnPrimary : s.btnDisabled) }}
        >
          + Add Person
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
          <>
            <select
              value={pendingRelType}
              onChange={(e) => setPendingRelType(e.target.value)}
              style={s.select}
            >
              {REL_TYPES.map((t) => (
                <option key={t} value={t}>{t.replace('_', ' ')}</option>
              ))}
            </select>
            <p style={s.hint}>
              {pendingConnectId
                ? '→ Click target node'
                : 'Click source node'}
            </p>
          </>
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
                <span style={{ ...s.dot, background: dotColor(selectedNode) }} />
                <span style={s.cardLabel}>{selectedNode.fullName}</span>
              </div>
              {selectedNode.relationshipToSelf && (
                <p style={s.cardMeta}>{selectedNode.relationshipToSelf}</p>
              )}
              {(selectedNode.birthYear || selectedNode.deathYear) && (
                <p style={s.cardMeta}>
                  {selectedNode.birthYear ?? '?'}
                  {!selectedNode.isAlive && ` — ${selectedNode.deathYear ?? '?'}`}
                </p>
              )}
              <p style={{ ...s.cardMeta, textTransform: 'capitalize' }}>
                {selectedNode.nodeState}
                {selectedNode.occupation ? ` · ${selectedNode.occupation}` : ''}
              </p>
            </div>

            {selectedNode.canDelete && (
              <button
                onClick={() => removeNode(selectedNode.id)}
                style={{ ...s.btn, ...s.btnDanger }}
              >
                Delete Person
              </button>
            )}
          </section>
        </>
      )}

      {/* ── Error toast ── */}
      {error && (
        <>
          <div style={s.divider} />
          <p style={s.errorText}>{error}</p>
        </>
      )}

      {/* ── Find Connection ── */}
      <div style={s.divider} />
      <section style={s.section}>
        <button
          onClick={togglePathMode}
          style={{ ...s.btn, ...(pathMode ? s.btnAccent : s.btnSecondary) }}
        >
          {pathMode ? '✕ Cancel Path Find' : '⟷ Find Connection'}
        </button>
      </section>

      {/* ── View Toggles ── */}
      <div style={s.divider} />
      <section style={s.section}>
        <p style={s.heading}>View</p>
        <button
          onClick={toggleShells}
          style={{ ...s.btn, ...(showShells ? s.btnSecondary : s.btnDisabled) }}
        >
          {showShells ? '◉ Orbit Circles' : '○ Orbit Circles'}
        </button>
        <button
          onClick={toggleEdges}
          style={{ ...s.btn, ...(showEdges ? s.btnSecondary : s.btnDisabled) }}
        >
          {showEdges ? '◉ Connections' : '○ Connections'}
        </button>
      </section>

      {/* ── Theme + Logout ── */}
      <div style={s.divider} />
      <section style={{ ...s.section, paddingBottom: 0 }}>
        <button onClick={toggleTheme} style={{ ...s.btn, ...s.btnSecondary }}>
          {isDark ? '☀ Light Mode' : '☾ Dark Mode'}
        </button>
        <button onClick={logout} style={{ ...s.btn, ...s.btnLogout }}>
          Log Out
        </button>
      </section>
    </div>
  )
}

const s = {
  panel: {
    position: 'fixed',
    bottom: 24,
    left: 20,
    zIndex: 100,
    width: 224,
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
  select: {
    width: '100%',
    padding: '6px 8px',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 7,
    color: '#fff',
    fontSize: 12,
    outline: 'none',
    cursor: 'pointer',
    boxSizing: 'border-box',
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
  btnPrimary:   { background: '#6c63ff', color: '#fff' },
  btnDisabled:  { background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.3)', cursor: 'default' },
  btnSecondary: { background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)' },
  btnAccent:    { background: '#6c63ff', color: '#fff', boxShadow: '0 0 12px rgba(108,99,255,0.5)' },
  btnDanger:    { background: 'rgba(239,68,68,0.2)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' },
  btnLogout:    { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', fontSize: 12 },
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
  cardRow:  { display: 'flex', alignItems: 'center', gap: 8 },
  dot:      { width: 8, height: 8, borderRadius: '50%', flexShrink: 0 },
  cardLabel: { fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  cardMeta:  { margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.4)', paddingLeft: 16 },
  errorText: { margin: '6px 0 0', fontSize: 11, color: '#f87171', textAlign: 'center' },
}
