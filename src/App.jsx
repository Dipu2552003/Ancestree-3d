import { Canvas } from '@react-three/fiber'
import Graph from './components/Graph'
import SearchBar from './components/SearchBar'
import ControlPanel from './components/ControlPanel'
import Legend from './components/Legend'
import './App.css'

export default function App() {
  return (
    <div id="canvas-root">
      <SearchBar />
      <ControlPanel />
      <Legend />
      <Canvas
        camera={{ position: [0, 0, 500], fov: 60, near: 1, far: 2000 }}
        gl={{ antialias: true }}
      >
        <Graph />
      </Canvas>
    </div>
  )
}
