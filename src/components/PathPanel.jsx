import useGraphStore from '../store/useGraphStore'

export default function PathPanel() {
  const nodes       = useGraphStore((s) => s.nodes)
  const pathMode    = useGraphStore((s) => s.pathMode)
  const pathSource  = useGraphStore((s) => s.pathSource)
  const pathTarget  = useGraphStore((s) => s.pathTarget)
  const pathResults = useGraphStore((s) => s.pathResults)
  const clearPaths  = useGraphStore((s) => s.clearPaths)
  const isDark      = useGraphStore((s) => s.isDark)

  if (!pathMode) return null

  const nameOf = (id) => nodes.find((n) => n.id === id)?.label ?? id

  const panelBg     = isDark ? 'rgba(10,10,20,0.92)'  : 'rgba(255,247,237,0.95)'
  const border      = isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.10)'
  const textColor   = isDark ? '#EDE8E3' : '#1A0A00'
  const subColor    = isDark ? 'rgba(237,232,227,0.45)' : 'rgba(26,10,0,0.45)'
  const pathBg      = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'
  const pathBorder  = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)'
  const arrowColor  = isDark ? '#8A7060' : '#D97706'

  // status message
  let statusText = 'Click a node to set start'
  if (pathSource && !pathTarget) statusText = `From: ${nameOf(pathSource)} — now click end node`
  if (pathSource && pathTarget)  statusText = `${nameOf(pathSource)} → ${nameOf(pathTarget)}`

  return (
    <div style={{
      position: 'fixed',
      top: 24,
      right: 20,
      zIndex: 100,
      width: 280,
      maxHeight: 'calc(100vh - 48px)',
      display: 'flex',
      flexDirection: 'column',
      background: panelBg,
      backdropFilter: 'blur(12px)',
      border,
      borderRadius: 12,
      fontFamily: 'system-ui, sans-serif',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 14px 10px',
        borderBottom: border,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div>
          <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#EA580C' }}>
            Find Connection
          </p>
          <p style={{ margin: '3px 0 0', fontSize: 11, color: subColor }}>{statusText}</p>
        </div>
        {(pathSource || pathTarget) && (
          <button
            onClick={clearPaths}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: subColor, fontSize: 11, padding: '2px 6px',
              borderRadius: 5,
            }}
          >
            Reset
          </button>
        )}
      </div>

      {/* Results */}
      <div style={{ overflowY: 'auto', padding: '10px 14px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {pathResults.length === 0 && pathTarget && (
          <p style={{ margin: 0, fontSize: 12, color: subColor, textAlign: 'center', padding: '12px 0' }}>
            No connection found
          </p>
        )}

        {pathResults.length > 0 && (
          <p style={{ margin: '0 0 4px', fontSize: 10, color: subColor, letterSpacing: '0.06em' }}>
            {pathResults.length} path{pathResults.length !== 1 ? 's' : ''} found
          </p>
        )}

        {pathResults.map((path, pi) => (
          <div key={pi} style={{
            background: pathBg,
            border: `1px solid ${pathBorder}`,
            borderRadius: 8,
            padding: '8px 10px',
          }}>
            <p style={{ margin: '0 0 6px', fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#EA580C' }}>
              Path {pi + 1} · {path.length} {path.length === 1 ? 'person' : 'people'}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {path.map((id, idx) => (
                <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {idx > 0 && (
                    <span style={{ fontSize: 9, color: arrowColor, paddingLeft: 8 }}>↓</span>
                  )}
                  <span style={{
                    fontSize: idx === 0 || idx === path.length - 1 ? 12 : 11,
                    fontWeight: idx === 0 || idx === path.length - 1 ? 600 : 400,
                    color: idx === 0
                      ? '#22C55E'
                      : idx === path.length - 1
                        ? '#3B82F6'
                        : textColor,
                    paddingLeft: idx > 0 ? 14 : 0,
                  }}>
                    {nameOf(id)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
