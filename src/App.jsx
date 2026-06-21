import { useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import Graph from './components/Graph'
import SearchBar from './components/SearchBar'
import ControlPanel from './components/ControlPanel'
import Legend from './components/Legend'
import PathPanel from './components/PathPanel'
import useGraphStore from './store/useGraphStore'
import './App.css'

export default function App() {
  // Auth is handled entirely by the frontend — the token arrives via the URL
  // hash (see bootstrapAuth.js). There is no login screen in this app.
  const isDark    = useGraphStore((s) => s.isDark)
  const isLoading = useGraphStore((s) => s.isLoading)
  const error     = useGraphStore((s) => s.error)
  const fetchGraph = useGraphStore((s) => s.fetchGraph)

  // OrbitControls always adds a contextmenu listener that calls preventDefault(),
  // blocking the browser's right-click menu regardless of mouseButtons config.
  // Intercept in capture phase (fires before OrbitControls' bubble handler)
  // so preventDefault() is never called and the native menu appears normally.
  useEffect(() => {
    const stop = (e) => { if (e.target.tagName === 'CANVAS') e.stopImmediatePropagation() }
    document.addEventListener('contextmenu', stop, { capture: true })
    return () => document.removeEventListener('contextmenu', stop, { capture: true })
  }, [])

  const bg       = isDark ? '#0b0a09'                 : '#FFF7ED'
  const dotColor = isDark ? 'rgba(255,255,255,0.055)' : 'rgba(160,100,40,0.18)'

  return (
    <div
      id="canvas-root"
      style={{
        background: bg,
        backgroundImage: `radial-gradient(circle, ${dotColor} 1.2px, transparent 1.2px)`,
        backgroundSize: '22px 22px',
      }}
    >
      <SearchBar />
      <ControlPanel />
      <Legend />
      <PathPanel />
      <Canvas
        camera={{ position: [0, 250, 900], fov: 55, near: 1, far: 3000 }}
        gl={{ antialias: true, alpha: true }}
      >
        <Graph />
      </Canvas>

      {/* Loading spinner */}
      {isLoading && (
        <div style={{
          position: 'fixed', inset: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          background: isDark ? 'rgba(11,10,9,0.7)' : 'rgba(255,247,237,0.7)',
          backdropFilter: 'blur(4px)',
          zIndex: 999,
          gap: 16,
          pointerEvents: 'none',
        }}>
          <div style={{
            width: 40, height: 40,
            border: `3px solid ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(234,88,12,0.2)'}`,
            borderTopColor: '#EA580C',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
          <span style={{ color: isDark ? '#aaa' : '#92400e', fontSize: 14, fontFamily: 'Inter, sans-serif' }}>
            Loading family graph…
          </span>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* Error banner */}
      {!isLoading && error && (
        <div style={{
          position: 'fixed', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 999,
          pointerEvents: 'none',
        }}>
          <div style={{
            pointerEvents: 'all',
            background: isDark ? '#1c1917' : '#fff',
            border: '1.5px solid #EA580C',
            borderRadius: 12,
            padding: '28px 32px',
            maxWidth: 420,
            width: '90%',
            boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
            display: 'flex', flexDirection: 'column', gap: 12,
            fontFamily: 'Inter, sans-serif',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 22 }}>⚠️</span>
              <span style={{ fontWeight: 700, fontSize: 16, color: isDark ? '#f5f5f4' : '#1c1917' }}>
                Could not load family graph
              </span>
            </div>
            <p style={{ fontSize: 13, color: isDark ? '#a8a29e' : '#57534e', lineHeight: 1.6, margin: 0 }}>
              {error}
            </p>
            <p style={{ fontSize: 12, color: isDark ? '#78716c' : '#a8a29e', margin: 0 }}>
              Make sure the backend is running at <code style={{ background: isDark ? '#292524' : '#fef3c7', padding: '1px 5px', borderRadius: 4 }}>{import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api'}</code>
            </p>
            <button
              onClick={fetchGraph}
              style={{
                marginTop: 4,
                padding: '8px 20px',
                background: '#EA580C',
                color: '#fff',
                border: 'none',
                borderRadius: 7,
                fontWeight: 600,
                fontSize: 14,
                cursor: 'pointer',
                alignSelf: 'flex-start',
              }}
            >
              Retry
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
