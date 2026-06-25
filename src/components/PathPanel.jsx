import useGraphStore from '../store/useGraphStore'
import useIsMobile from '../lib/useIsMobile'

export default function PathPanel() {
  const nodes       = useGraphStore((s) => s.nodes)
  const pathMode    = useGraphStore((s) => s.pathMode)
  const pathSource  = useGraphStore((s) => s.pathSource)
  const pathTarget  = useGraphStore((s) => s.pathTarget)
  const pathResults = useGraphStore((s) => s.pathResults)
  const clearPaths  = useGraphStore((s) => s.clearPaths)
  const isDark      = useGraphStore((s) => s.isDark)
  const isMobile    = useIsMobile()

  if (!pathMode) return null

  const nameOf = (id) => nodes.find((n) => n.id === id)?.label ?? id

  // Only the shortest connection is computed/stored now.
  const shortest = pathResults[0] ?? null

  const panelBg     = isDark ? 'rgba(10,10,20,0.92)'  : 'rgba(255,247,237,0.96)'
  const border      = isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.10)'
  const textColor   = isDark ? '#EDE8E3' : '#1A0A00'
  const subColor    = isDark ? 'rgba(237,232,227,0.45)' : 'rgba(26,10,0,0.45)'
  const pathBg      = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'
  const pathBorder  = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)'
  const arrowColor  = isDark ? '#8A7060' : '#D97706'

  // status message
  let statusText = 'Tap a node to set start'
  if (pathSource && !pathTarget) statusText = `From: ${nameOf(pathSource)} — now tap the end node`
  if (pathSource && pathTarget)  statusText = `${nameOf(pathSource)} → ${nameOf(pathTarget)}`

  // Desktop: fixed top-right column. Mobile: bottom sheet sitting just above the
  // control pill (which is anchored at the bottom-centre), full-width with a
  // capped height so it never swallows the whole screen.
  const containerStyle = isMobile
    ? {
        position: 'fixed',
        left: 8, right: 8, bottom: 86,
        zIndex: 100,
        maxHeight: '42vh',
        display: 'flex', flexDirection: 'column',
        background: panelBg, backdropFilter: 'blur(12px)',
        border, borderRadius: 14,
        fontFamily: 'system-ui, sans-serif',
        overflow: 'hidden',
        boxShadow: isDark ? '0 8px 30px rgba(0,0,0,0.5)' : '0 8px 30px rgba(0,0,0,0.15)',
      }
    : {
        position: 'fixed',
        top: 24, right: 20,
        zIndex: 100,
        width: 280,
        maxHeight: 'calc(100vh - 48px)',
        display: 'flex', flexDirection: 'column',
        background: panelBg, backdropFilter: 'blur(12px)',
        border, borderRadius: 12,
        fontFamily: 'system-ui, sans-serif',
        overflow: 'hidden',
      }

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={{
        padding: '12px 14px 10px',
        borderBottom: border,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        flexShrink: 0,
      }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#EA580C' }}>
            Find Connection
          </p>
          <p style={{
            margin: '3px 0 0', fontSize: 11, color: subColor,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {statusText}
          </p>
        </div>
        {(pathSource || pathTarget) && (
          <button
            onClick={clearPaths}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: subColor, fontSize: 11, padding: '4px 8px',
              borderRadius: 6, flexShrink: 0,
            }}
          >
            Reset
          </button>
        )}
      </div>

      {/* Result — the single shortest connection */}
      <div style={{ overflowY: 'auto', padding: '10px 14px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {!shortest && pathTarget && (
          <p style={{ margin: 0, fontSize: 12, color: subColor, textAlign: 'center', padding: '12px 0' }}>
            No connection found
          </p>
        )}

        {shortest && (
          <>
            <p style={{ margin: '0 0 2px', fontSize: 10, color: subColor, letterSpacing: '0.06em' }}>
              Shortest connection · {shortest.length - 1} step{shortest.length - 1 !== 1 ? 's' : ''}
            </p>
            <div style={{
              background: pathBg,
              border: `1px solid ${pathBorder}`,
              borderRadius: 10,
              padding: '10px 12px',
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {shortest.map((id, idx) => (
                  <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {idx > 0 && (
                      <span style={{ fontSize: 10, color: arrowColor, paddingLeft: 8 }}>↓</span>
                    )}
                    <span style={{
                      fontSize: idx === 0 || idx === shortest.length - 1 ? 13 : 12,
                      fontWeight: idx === 0 || idx === shortest.length - 1 ? 600 : 400,
                      color: idx === 0
                        ? '#22C55E'
                        : idx === shortest.length - 1
                          ? '#3B82F6'
                          : textColor,
                      paddingLeft: idx > 0 ? 14 : 0,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {nameOf(id)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
