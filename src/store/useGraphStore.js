import { create } from 'zustand'

const CATEGORY_COLORS = {
  concept: '#6c63ff',
  memory:  '#00d4aa',
  skill:   '#ffd93d',
  fact:    '#74b9ff',
  idea:    '#fd79a8',
  default: '#aaaacc',
}

function randomOnSphere(r) {
  const u = Math.random() * 2 - 1
  const theta = Math.random() * Math.PI * 2
  const s = Math.sqrt(1 - u * u)
  return {
    x: r * s * Math.cos(theta),
    y: r * s * Math.sin(theta),
    z: r * u,
  }
}

let _nextId = 1

const useGraphStore = create((set, get) => ({
  nodes: [],
  edges: [],
  selectedNodeId: null,
  pendingConnectId: null,
  connectMode: false,
  searchQuery: '',

  setSearchQuery(query) {
    set({ searchQuery: query })
  },

  addNode(label, category = 'default', orbitRadius = 150) {
    const { x, y, z } = randomOnSphere(orbitRadius)
    const node = {
      id: String(_nextId++),
      label,
      category,
      orbitRadius,
      x, y, z,
      vx: 0, vy: 0, vz: 0,
      color: CATEGORY_COLORS[category] ?? CATEGORY_COLORS.default,
    }
    set((s) => ({ nodes: [...s.nodes, node] }))
  },

  addEdge(sourceId, targetId) {
    const { edges } = get()
    const exists = edges.some(
      (e) => (e.sourceId === sourceId && e.targetId === targetId) ||
             (e.sourceId === targetId && e.targetId === sourceId)
    )
    if (exists) return
    const edge = { id: `${sourceId}-${targetId}`, sourceId, targetId }
    set((s) => ({ edges: [...s.edges, edge] }))
  },

  removeNode(id) {
    set((s) => ({
      nodes: s.nodes.filter((n) => n.id !== id),
      edges: s.edges.filter((e) => e.sourceId !== id && e.targetId !== id),
      selectedNodeId: s.selectedNodeId === id ? null : s.selectedNodeId,
    }))
  },

  selectNode(id) {
    set({ selectedNodeId: id })
  },

  toggleConnectMode() {
    set((s) => ({ connectMode: !s.connectMode, pendingConnectId: null }))
  },

  setPendingConnect(id) {
    set({ pendingConnectId: id })
  },
}))

export default useGraphStore
