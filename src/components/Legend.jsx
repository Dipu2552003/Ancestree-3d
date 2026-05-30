const CATEGORIES = [
  { label: 'concept', color: '#6c63ff' },
  { label: 'memory',  color: '#00d4aa' },
  { label: 'skill',   color: '#ffd93d' },
  { label: 'fact',    color: '#74b9ff' },
  { label: 'idea',    color: '#fd79a8' },
]

export default function Legend() {
  return (
    <div style={s.panel}>
      <p style={s.heading}>Categories</p>
      {CATEGORIES.map(({ label, color }) => (
        <div key={label} style={s.row}>
          <span style={{ ...s.dot, background: color }} />
          <span style={s.label}>{label}</span>
        </div>
      ))}
    </div>
  )
}

const s = {
  panel: {
    position: 'fixed',
    bottom: 24,
    right: 20,
    zIndex: 100,
    background: 'rgba(10,10,20,0.85)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: '12px 16px',
    fontFamily: 'system-ui, sans-serif',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    minWidth: 120,
  },
  heading: {
    margin: 0,
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.4)',
    marginBottom: 2,
  },
  row: {
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
  label: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    textTransform: 'capitalize',
  },
}
