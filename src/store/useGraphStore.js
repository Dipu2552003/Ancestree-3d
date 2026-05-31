import { create } from 'zustand'
import { api } from '../lib/api'

// ── helpers ────────────────────────────────────────────────────────────────

// Sphere shell radius per generation.
// Nucleus = oldest ancestors (small r). You/self = mid-shell. Descendants expand outward.
export const SHELL_RADII = [80, 160, 240, 320, 400, 480]

const GENERATION_RADIUS = {
  'Great-Grandfather':  80,
  'Great-Grandmother':  80,
  'Grandfather':       160,
  'Grandmother':       160,
  'Father':            240,
  'Mother':            240,
  'Uncle':             240,
  'Aunt':              240,
  'You':               320,
  'Husband':           320,
  'Wife':              320,
  'Brother':           320,
  'Sister':            320,
  'Cousin':            320,
  'Son':               400,
  'Daughter':          400,
  'Son-in-Law':        400,
  'Daughter-in-Law':   400,
  'Grandson':          480,
  'Granddaughter':     480,
}

function shellRadius(data) {
  if (data.isSelf) return 320
  return GENERATION_RADIUS[data.relationshipToSelf] ?? 320
}

// Place a node uniformly at random on the surface of a sphere of radius r.
function randomOnSphere(r) {
  const u     = Math.random() * 2 - 1
  const theta = Math.random() * Math.PI * 2
  const s     = Math.sqrt(1 - u * u)
  return { x: r * s * Math.cos(theta), y: r * s * Math.sin(theta), z: r * u }
}

const NODE_COLOR = {
  self:     '#EA580C',   // saffron  — the logged-in user
  deceased: '#94A3B8',   // slate    — deceased members
  claimed:  '#6c63ff',   // purple   — active, joined members
  invited:  '#ffd93d',   // yellow   — invite sent, not yet joined
  proxy:    '#aaaacc',   // grey     — added but not on platform
}

function nodeColor(data) {
  if (data.isSelf)        return NODE_COLOR.self
  if (data.isDeceased)    return NODE_COLOR.deceased
  return NODE_COLOR[data.nodeState] ?? NODE_COLOR.proxy
}

// Map a graph API node (shape: { id, data: { personId, fullName, ... } })
// to the flat store node shape the 3D scene expects.
function apiNodeToStore(apiNode) {
  const d   = apiNode.data
  const r   = shellRadius(d)
  const pos = randomOnSphere(r)
  return {
    // 3D physics fields
    id: d.personId,
    label: d.fullName,
    category: d.nodeState,
    orbitRadius: r,
    x: pos.x, y: pos.y, z: pos.z, vx: 0, vy: 0, vz: 0,
    color: nodeColor(d),
    // API fields preserved for the panel
    personId:          d.personId,
    personCode:        d.personCode,
    fullName:          d.fullName,
    birthYear:         d.birthYear,
    deathYear:         d.deathYear,
    isAlive:           d.isAlive,
    isDeceased:        d.isDeceased,
    photoUrl:          d.photoUrl,
    nodeState:         d.nodeState,
    isSelf:            d.isSelf,
    relationshipToSelf: d.relationshipToSelf,
    canEdit:           d.canEdit,
    canDelete:         d.canDelete,
    canInvite:         d.canInvite,
    gender:            d.gender,
    nickname:          d.nickname,
    occupation:        d.occupation,
  }
}

// Map a graph API edge (shape: { id, source, target, data: { relType, ... } })
function apiEdgeToStore(apiEdge) {
  return {
    id:       apiEdge.id,
    sourceId: apiEdge.source,
    targetId: apiEdge.target,
    relType:  apiEdge.data.relType,
    subType:  apiEdge.data.subType,
  }
}

// ── store ──────────────────────────────────────────────────────────────────

const useGraphStore = create((set, get) => ({
  // auth
  token:     localStorage.getItem('kg_token') ?? null,
  user:      null,
  isLoading: false,
  error:     null,

  // theme
  isDark: localStorage.getItem('kg_theme') === 'dark',
  toggleTheme() {
    set((s) => {
      const next = !s.isDark
      localStorage.setItem('kg_theme', next ? 'dark' : 'light')
      return { isDark: next }
    })
  },

  // view toggles
  showShells: true,
  showEdges:  true,
  toggleShells() { set((s) => ({ showShells: !s.showShells })) },
  toggleEdges()  { set((s) => ({ showEdges:  !s.showEdges  })) },

  // path finding
  pathMode:    false,
  pathSource:  null,
  pathTarget:  null,
  pathResults: [],   // array of arrays of node ids

  togglePathMode() {
    set((s) => ({
      pathMode: !s.pathMode,
      pathSource: null, pathTarget: null, pathResults: [],
    }))
  },

  setPathNode(id) {
    const { pathSource, nodes, edges } = get()
    if (!pathSource) {
      set({ pathSource: id, pathTarget: null, pathResults: [] })
      return
    }
    if (id === pathSource) return
    // Build undirected adjacency list
    const adj = {}
    for (const e of edges) {
      ;(adj[e.sourceId] ??= []).push(e.targetId)
      ;(adj[e.targetId] ??= []).push(e.sourceId)
    }
    // DFS to find all simple paths (max depth 12, max 30 results)
    const results = []
    function dfs(cur, target, visited, path) {
      if (results.length >= 30) return
      if (path.length > 13) return
      if (cur === target) { results.push([...path]); return }
      for (const nb of (adj[cur] ?? [])) {
        if (!visited.has(nb)) {
          visited.add(nb); path.push(nb)
          dfs(nb, target, visited, path)
          path.pop(); visited.delete(nb)
        }
      }
    }
    dfs(pathSource, id, new Set([pathSource]), [pathSource])
    set({ pathTarget: id, pathResults: results })
  },

  clearPaths() { set({ pathSource: null, pathTarget: null, pathResults: [] }) },

  // graph
  nodes:           [],
  edges:           [],
  selectedNodeId:  null,
  pendingConnectId: null,
  connectMode:     false,
  pendingRelType:  'PARENT_OF',
  searchQuery:     '',

  // ── auth actions ──

  async login(email, password) {
    set({ isLoading: true, error: null })
    try {
      const data = await api.login(email, password)
      localStorage.setItem('kg_token', data.token)
      set({ token: data.token, user: data.user, isLoading: false })
    } catch (err) {
      set({ error: err.message, isLoading: false })
    }
  },

  async signup(email, password, displayName) {
    set({ isLoading: true, error: null })
    try {
      const data = await api.signup(email, password, displayName)
      localStorage.setItem('kg_token', data.token)
      set({ token: data.token, user: data.user, isLoading: false })
    } catch (err) {
      set({ error: err.message, isLoading: false })
    }
  },

  logout() {
    localStorage.removeItem('kg_token')
    set({ token: null, user: null, nodes: [], edges: [], selectedNodeId: null, error: null })
  },

  // ── graph actions ──

  async fetchGraph() {
    set({ isLoading: true, error: null })
    try {
      const { nodes, edges } = await api.getGraph()
      set({
        nodes: nodes.map(apiNodeToStore),
        edges: edges.map(apiEdgeToStore),
        isLoading: false,
      })
    } catch (err) {
      set({ error: err.message, isLoading: false })
    }
  },

  async addNode(fullName, orbitRadius = 320) {
    set({ error: null })
    try {
      const person = await api.createPerson({ full_name: fullName })
      const pos = randomOnSphere(orbitRadius)
      const node = {
        id: person.id, label: person.full_name,
        category: 'proxy', orbitRadius,
        x: pos.x, y: pos.y, z: pos.z, vx: 0, vy: 0, vz: 0,
        color: NODE_COLOR.proxy,
        personId: person.id, personCode: person.person_code,
        fullName: person.full_name, birthYear: null, deathYear: null,
        isAlive: true, isDeceased: false, photoUrl: null,
        nodeState: 'proxy', isSelf: false,
        relationshipToSelf: 'Relative',
        canEdit: true, canDelete: true, canInvite: true,
        gender: null, nickname: null, occupation: null,
      }
      set((s) => ({ nodes: [...s.nodes, node] }))
    } catch (err) {
      set({ error: err.message })
    }
  },

  async removeNode(id) {
    set({ error: null })
    const { edges } = get()
    const connected = edges.filter((e) => e.sourceId === id || e.targetId === id)
    try {
      await Promise.all(connected.map((e) => api.deleteRelationship(e.id)))
      await api.deletePerson(id)
      set((s) => ({
        nodes: s.nodes.filter((n) => n.id !== id),
        edges: s.edges.filter((e) => e.sourceId !== id && e.targetId !== id),
        selectedNodeId: s.selectedNodeId === id ? null : s.selectedNodeId,
      }))
    } catch (err) {
      set({ error: err.message })
    }
  },

  async addEdge(sourceId, targetId) {
    const { edges, pendingRelType } = get()
    const exists = edges.some(
      (e) => (e.sourceId === sourceId && e.targetId === targetId) ||
             (e.sourceId === targetId && e.targetId === sourceId)
    )
    if (exists) return
    set({ error: null })
    try {
      const rel = await api.createRelationship({
        from_person_id: sourceId,
        to_person_id:   targetId,
        rel_type:       pendingRelType,
      })
      set((s) => ({
        edges: [...s.edges, {
          id:       rel.id,
          sourceId: rel.from_person_id,
          targetId: rel.to_person_id,
          relType:  rel.rel_type,
          subType:  rel.sub_type,
        }],
      }))
    } catch (err) {
      set({ error: err.message })
    }
  },

  selectNode(id)       { set({ selectedNodeId: id }) },
  setPendingConnect(id){ set({ pendingConnectId: id }) },
  setPendingRelType(t) { set({ pendingRelType: t }) },
  setSearchQuery(q)    { set({ searchQuery: q }) },
  toggleConnectMode()  {
    set((s) => ({ connectMode: !s.connectMode, pendingConnectId: null }))
  },
}))

export default useGraphStore
