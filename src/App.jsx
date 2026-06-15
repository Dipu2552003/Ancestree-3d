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
  const isDark = useGraphStore((s) => s.isDark)

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
    </div>
  )
}
