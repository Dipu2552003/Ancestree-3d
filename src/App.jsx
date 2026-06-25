import { useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import Graph from './components/Graph'
import SearchBar from './components/SearchBar'
import ControlPanel from './components/ControlPanel'
import Legend from './components/Legend'
import PathPanel from './components/PathPanel'
import ErrorModal from './components/ErrorModal'
import useGraphStore from './store/useGraphStore'
import './App.css'

export default function App() {
  // Auth is handled entirely by the frontend — the token arrives via the URL
  // hash (see bootstrapAuth.js). There is no login screen in this app.
  const isDark    = useGraphStore((s) => s.isDark)
  const isLoading = useGraphStore((s) => s.isLoading)

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
        // `far` starts generous and is then auto-expanded in Graph.jsx based on
        // the graph's actual extent — large families (population-sized rings)
        // can spread well past the old 3000-unit plane and would get clipped.
        camera={{ position: [0, 250, 900], fov: 55, near: 1, far: 12000 }}
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

      {/* Error modal — surfaces any store error (load, add, remove, search …) */}
      <ErrorModal />
    </div>
  )
}
