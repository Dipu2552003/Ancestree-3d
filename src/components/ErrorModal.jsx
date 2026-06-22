import useGraphStore from '../store/useGraphStore'

// Single, prominent surface for ANY error raised by a store action (graph load,
// add/remove node, relationship changes, search …). The store keeps `error` as a
// human-readable string built in lib/api.js, so we just present it clearly with
// a way to retry the graph load or dismiss and carry on.
export default function ErrorModal() {
  const isDark     = useGraphStore((s) => s.isDark)
  const isLoading  = useGraphStore((s) => s.isLoading)
  const error      = useGraphStore((s) => s.error)
  const fetchGraph = useGraphStore((s) => s.fetchGraph)
  const clearError = useGraphStore((s) => s.clearError)

  // Don't compete with the loading spinner; nothing to show when there's no error.
  if (isLoading || !error) return null

  const retry = () => { clearError(); fetchGraph() }

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-label="Error"
      onClick={clearError}                       // click backdrop to dismiss
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.45)',
        backdropFilter: 'blur(4px)',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}     // keep clicks inside from closing
        style={{
          position: 'relative',
          background: isDark ? '#1c1917' : '#fff',
          border: '1.5px solid #EA580C',
          borderRadius: 14,
          padding: '26px 28px 24px',
          maxWidth: 440, width: '90%',
          boxShadow: '0 12px 40px rgba(0,0,0,0.28)',
          display: 'flex', flexDirection: 'column', gap: 14,
        }}
      >
        {/* Close (X) */}
        <button
          onClick={clearError}
          aria-label="Dismiss"
          style={{
            position: 'absolute', top: 12, right: 12,
            width: 28, height: 28, lineHeight: '24px',
            border: 'none', borderRadius: 7, cursor: 'pointer',
            background: 'transparent',
            color: isDark ? '#78716c' : '#a8a29e',
            fontSize: 20,
          }}
        >
          ×
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingRight: 24 }}>
          <span style={{ fontSize: 22 }}>⚠️</span>
          <span style={{ fontWeight: 700, fontSize: 16, color: isDark ? '#f5f5f4' : '#1c1917' }}>
            Something went wrong
          </span>
        </div>

        <p style={{
          fontSize: 14, lineHeight: 1.6, margin: 0,
          color: isDark ? '#d6d3d1' : '#44403c',
          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        }}>
          {error}
        </p>

        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          <button
            onClick={retry}
            style={{
              padding: '9px 22px',
              background: '#EA580C', color: '#fff',
              border: 'none', borderRadius: 8,
              fontWeight: 600, fontSize: 14, cursor: 'pointer',
            }}
          >
            Retry
          </button>
          <button
            onClick={clearError}
            style={{
              padding: '9px 18px',
              background: 'transparent',
              color: isDark ? '#d6d3d1' : '#57534e',
              border: `1px solid ${isDark ? '#44403c' : '#e7e5e4'}`,
              borderRadius: 8,
              fontWeight: 600, fontSize: 14, cursor: 'pointer',
            }}
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  )
}
