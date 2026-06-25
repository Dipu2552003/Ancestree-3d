import { create } from 'zustand'
import { api } from '../lib/api'
import { redirectToLogin } from '../lib/auth'
import { getLayout } from '../layouts'
import SphereLayout, { getSphereOrbitRadius, sphereShellRadius, sphereRadiiByGen } from '../layouts/SphereLayout'
import { coneRingRadiusForCount } from '../layouts/ConeLayout'

// ── helpers ────────────────────────────────────────────────────────────────

// Returns sphere shell radius using BFS-computed generation when available,
// falling back to string-based lookup for nodes without one.
function shellRadius(nodeOrData) {
  if (typeof nodeOrData.generation === 'number') return sphereShellRadius(nodeOrData.generation)
  return getSphereOrbitRadius(nodeOrData)
}

// Map relationship string → generation number.
// All keys are lowercase — nodeGeneration() normalises the incoming string.
// Generation 0 = self, +N = Nth ancestor generation, −N = Nth descendant.
const RELATIONSHIP_TO_GENERATION = {
  // +3
  'great-grandfather': 3, 'great-grandmother': 3,
  'great grandfather': 3, 'great grandmother': 3,
  'great-grandpa': 3, 'great-grandma': 3,
  'great grandpa': 3, 'great grandma': 3,
  'great-grandfather-in-law': 3, 'great-grandmother-in-law': 3,

  // +2
  'grandfather': 2, 'grandmother': 2,
  'grandpa': 2, 'grandma': 2, 'nana': 2, 'nani': 2, 'dada': 2, 'dadi': 2,
  'nanaji': 2, 'dadaji': 2, 'nanabhai': 2,
  'great-uncle': 2, 'great-aunt': 2,
  'great uncle': 2, 'great aunt': 2,
  'grandfather-in-law': 2, 'grandmother-in-law': 2,

  // +1  (parents and their siblings / spouses)
  'father': 1, 'mother': 1,
  'dad': 1, 'mom': 1, 'papa': 1, 'mama': 1, 'maa': 1, 'ma': 1,
  'uncle': 1, 'aunt': 1, 'chacha': 1, 'chachi': 1, 'mama-uncle': 1,
  'step-father': 1, 'step-mother': 1, 'stepfather': 1, 'stepmother': 1,
  'father-in-law': 1, 'mother-in-law': 1,
  'sasur': 1, 'saas': 1,

  // 0  (self and same generation)
  'you': 0, 'self': 0,
  'husband': 0, 'wife': 0, 'spouse': 0, 'partner': 0,
  'brother': 0, 'sister': 0,
  'brother-in-law': 0, 'sister-in-law': 0,
  'bhai': 0, 'behen': 0, 'didi': 0,
  'step-brother': 0, 'step-sister': 0, 'stepbrother': 0, 'stepsister': 0,
  'half-brother': 0, 'half-sister': 0,
  'cousin': 0, 'cousin brother': 0, 'cousin sister': 0,
  // unknown relationships default to same level as self
  'relative': 0, 'unknown': 0, '': 0,

  // -1  (children and nephews / nieces)
  'son': -1, 'daughter': -1, 'beta': -1, 'beti': -1,
  'son-in-law': -1, 'daughter-in-law': -1,
  'step-son': -1, 'step-daughter': -1, 'stepson': -1, 'stepdaughter': -1,
  'nephew': -1, 'niece': -1,

  // -2
  'grandson': -2, 'granddaughter': -2,
  'pota': -2, 'poti': -2, 'nati': -2, 'nata': -2,
  'great-nephew': -2, 'great-niece': -2,
  'grandnephew': -2, 'grandniece': -2,

  // -3
  'great-grandson': -3, 'great-granddaughter': -3,
}

function nodeGeneration(data) {
  if (data.isSelf) return 0
  const rel = (data.relationshipToSelf ?? '').trim().toLowerCase()
  // Exact match first
  if (rel in RELATIONSHIP_TO_GENERATION) return RELATIONSHIP_TO_GENERATION[rel]
  // Partial match — handles "Relative Relative", "Great Grandfather", etc.
  for (const [key, gen] of Object.entries(RELATIONSHIP_TO_GENERATION)) {
    if (key && rel.includes(key)) return gen
  }
  return 0  // safe default: same ring as self rather than a wrong formula
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
// Accepts an optional layout (defaults to SphereLayout for backward compat).
// Cone ring radius formula — mirrors ConeLayout.js constants
const CONE_MAX_GEN = 3
const CONE_RADIUS_STEP = 90
function coneRingRadius(gen) {
  return Math.max(CONE_RADIUS_STEP, (CONE_MAX_GEN + 1 - gen) * CONE_RADIUS_STEP)
}

// Build a gen → ring-radius lookup for the cone layout that sizes each ring by
// how many nodes share that generation (see ConeLayout.coneRingRadiusForCount).
function coneRadiusByGen(nodes) {
  const counts = new Map()
  for (const n of nodes) {
    const g = n.generation ?? 0
    counts.set(g, (counts.get(g) ?? 0) + 1)
  }
  return (gen) => coneRingRadiusForCount(counts.get(gen) ?? 1)
}

function apiNodeToStore(apiNode, layout = SphereLayout) {
  const d   = apiNode.data
  const gen = nodeGeneration(d)
  // Use the layout-appropriate orbit radius so camera fly-to works correctly.
  // Cone → XZ ring radius (derived from generation). Sphere → sphere shell radius.
  const r = layout.id === 'cone' ? coneRingRadius(gen) : shellRadius(d)
  const nodeForLayout = { ...d, orbitRadius: r, generation: gen }
  const pos = layout.getInitialPosition(nodeForLayout)
  return {
    // 3D physics fields
    id: d.personId,
    label: d.fullName,
    category: d.nodeState,
    orbitRadius: r,
    generation: gen,
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

// ── BFS generation computation (mirrors 2D computeGenerations.ts) ──────────
// 3D cone convention: self=0, parents=+1, grandparents=+2, children=-1 ...
// (opposite sign from the 2D app because 3D y-axis goes UP)
//
// Uses actual edge structure — ignores relationshipToSelf strings entirely.
// This is the reliable source of truth: if the graph is connected from self,
// every reachable node gets the correct orbit ring.

function computeGenerations3D(nodes, edges) {
  const gens = new Map()
  const selfNode = nodes.find(n => n.isSelf)
  if (!selfNode) {
    // No self node — fall back to generation field already on each node
    nodes.forEach(n => gens.set(n.id, n.generation ?? 0))
    return gens
  }

  gens.set(selfNode.id, 0)
  const queue   = [{ id: selfNode.id, gen: 0 }]
  const visited = new Set([selfNode.id])

  while (queue.length > 0) {
    const { id, gen } = queue.shift()

    for (const e of edges) {
      const rel = (e.relType ?? '').toUpperCase()

      if (rel === 'PARENT_OF') {
        // source is parent → target is child
        if (e.sourceId === id && !visited.has(e.targetId)) {
          visited.add(e.targetId)
          gens.set(e.targetId, gen - 1)           // child: one ring lower
          queue.push({ id: e.targetId, gen: gen - 1 })
        }
        if (e.targetId === id && !visited.has(e.sourceId)) {
          visited.add(e.sourceId)
          gens.set(e.sourceId, gen + 1)            // parent: one ring higher
          queue.push({ id: e.sourceId, gen: gen + 1 })
        }
      } else if (rel === 'SPOUSE_OF') {
        if (e.sourceId === id && !visited.has(e.targetId)) {
          visited.add(e.targetId)
          gens.set(e.targetId, gen)                // spouse: same ring
          queue.push({ id: e.targetId, gen })
        }
        if (e.targetId === id && !visited.has(e.sourceId)) {
          visited.add(e.sourceId)
          gens.set(e.sourceId, gen)
          queue.push({ id: e.sourceId, gen })
        }
      }
    }
  }

  // Unreachable nodes (no path from self) default to gen 0
  for (const n of nodes) {
    if (!gens.has(n.id)) gens.set(n.id, 0)
  }

  return gens
}

// Single shortest connection (fewest hops) between two nodes, as an array of
// node ids, or null if they aren't connected. Shared by the canvas-click and
// search-based path selection flows.
function shortestPathBetween(sourceId, targetId, edges) {
  if (!sourceId || !targetId || sourceId === targetId) return null
  const adj = {}
  for (const e of edges) {
    ;(adj[e.sourceId] ??= []).push(e.targetId)
    ;(adj[e.targetId] ??= []).push(e.sourceId)
  }
  const prev    = new Map()
  const visited = new Set([sourceId])
  const queue   = [sourceId]
  let found = false
  while (queue.length > 0) {
    const cur = queue.shift()
    if (cur === targetId) { found = true; break }
    for (const nb of (adj[cur] ?? [])) {
      if (!visited.has(nb)) {
        visited.add(nb)
        prev.set(nb, cur)
        queue.push(nb)
      }
    }
  }
  if (!found) return null
  const path = []
  for (let c = targetId; c !== undefined; c = prev.get(c)) path.unshift(c)
  return path
}

// ── store ──────────────────────────────────────────────────────────────────

const useGraphStore = create((set, get) => ({
  // auth
  token:     localStorage.getItem('kg_token') ?? null,
  user:      null,
  isLoading: false,
  error:     null,   // human-readable message string, or null

  clearError() { set({ error: null }) },

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

  // ── layout / style strategy ─────────────────────────────────────────────
  // Only 'sphere' and 'cone' are supported; a stale stored value (e.g. a
  // removed 'force'/'tree'/'helix') falls back to sphere.
  currentLayout:    ['sphere', 'cone'].includes(localStorage.getItem('kg_layout'))
    ? localStorage.getItem('kg_layout')
    : 'cone',
  currentNodeStyle: localStorage.getItem('kg_nodestyle') ?? 'polaroid',
  currentEdgeStyle: localStorage.getItem('kg_edgestyle') ?? 'line',

  setLayout(id) {
    const layout = getLayout(id)
    const { nodes, edges } = get()
    // Recalculate orbitRadius for the target layout before positioning. Both
    // cone rings and sphere shells are now sized by their population.
    const coneRadius = id === 'cone' ? coneRadiusByGen(nodes) : null
    let sphereRadii = null
    if (id === 'sphere') {
      const counts = new Map()
      for (const n of nodes) {
        const g = n.generation ?? 0
        counts.set(g, (counts.get(g) ?? 0) + 1)
      }
      sphereRadii = sphereRadiiByGen(counts)
    }
    const reRadiused = nodes.map(n => {
      const gen = n.generation ?? 0
      const r   = id === 'cone'
        ? coneRadius(gen)
        : (sphereRadii ? sphereRadii.get(gen) : sphereShellRadius(gen))
      return { ...n, orbitRadius: r }
    })
    const posMap = typeof layout.getInitialPositions === 'function'
      ? layout.getInitialPositions(reRadiused, edges)
      : new Map(reRadiused.map(n => [n.id, layout.getInitialPosition(n)]))
    const repositioned = reRadiused.map(n => {
      const pos = posMap.get(n.id) ?? layout.getInitialPosition(n)
      return { ...n, ...pos, vx: 0, vy: 0, vz: 0 }
    })
    localStorage.setItem('kg_layout', id)
    set({ currentLayout: id, nodes: repositioned })
  },

  setNodeStyle(id) {
    localStorage.setItem('kg_nodestyle', id)
    set({ currentNodeStyle: id })
  },

  setEdgeStyle(id) {
    localStorage.setItem('kg_edgestyle', id)
    set({ currentEdgeStyle: id })
  },

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

  // Canvas-click flow: first click sets the start, second sets the end.
  setPathNode(id) {
    const { pathSource } = get()
    if (!pathSource) {
      set({ pathSource: id, pathTarget: null, pathResults: [] })
      return
    }
    if (id === pathSource) return
    get().setPathTarget(id)
  },

  // Search-based flow: either endpoint can be set/changed independently; the
  // shortest path is recomputed whenever both ends are present.
  setPathSource(id) {
    const { pathTarget, edges } = get()
    const path = pathTarget ? shortestPathBetween(id, pathTarget, edges) : null
    set({ pathSource: id, pathResults: path ? [path] : [] })
  },

  setPathTarget(id) {
    const { pathSource, edges } = get()
    const path = pathSource ? shortestPathBetween(pathSource, id, edges) : null
    set({ pathTarget: id, pathResults: path ? [path] : [] })
  },

  clearPaths() { set({ pathSource: null, pathTarget: null, pathResults: [] }) },

  // graph
  nodes:           [],
  edges:           [],
  selectedNodeId: null,
  searchQuery:    '',

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
    // No session handed over (direct visit) — bounce to the frontend login
    // rather than firing a request that's guaranteed to 401.
    if (!get().token) { redirectToLogin(); return }
    set({ isLoading: true, error: null })
    try {
      const { nodes: rawNodes, edges: rawEdges } = await api.getGraph()
      const layout     = getLayout(get().currentLayout)
      const storeEdges = rawEdges.map(apiEdgeToStore)
      let   storeNodes = rawNodes.map(n => apiNodeToStore(n, layout))

      // ── Step 1: BFS-compute generations from the self node ──────────────
      // This is the authoritative source — ignores unreliable relationship
      // strings and correctly places every reachable node on the right ring.
      const gens = computeGenerations3D(storeNodes, storeEdges)

      // ── Step 2: Apply BFS generations + recalculate orbitRadius ─────────
      // Size each generation's ring (cone) or shell (sphere) by how many people
      // land on it (population-aware) so spacing stays readable for any family
      // size — densely populated generations get larger rings/shells.
      const genCounts = new Map()
      for (const n of storeNodes) {
        const g = gens.get(n.id) ?? n.generation
        genCounts.set(g, (genCounts.get(g) ?? 0) + 1)
      }
      const sphereRadii = layout.id === 'sphere' ? sphereRadiiByGen(genCounts) : null
      storeNodes = storeNodes.map(n => {
        const gen = gens.get(n.id) ?? n.generation
        const r   = layout.id === 'cone'
          ? coneRingRadiusForCount(genCounts.get(gen) ?? 1)
          : (sphereRadii ? sphereRadii.get(gen) : shellRadius(n))
        return { ...n, generation: gen, orbitRadius: r }
      })

      // ── Step 3: Batch positioning with correct generations ───────────────
      if (typeof layout.getInitialPositions === 'function') {
        const posMap = layout.getInitialPositions(storeNodes, storeEdges)
        storeNodes = storeNodes.map(n => {
          const pos = posMap.get(n.id)
          return pos ? { ...n, ...pos, vx: 0, vy: 0, vz: 0 } : n
        })
      } else {
        storeNodes = storeNodes.map(n => ({
          ...n,
          ...layout.getInitialPosition(n),
          vx: 0, vy: 0, vz: 0,
        }))
      }

      set({ nodes: storeNodes, edges: storeEdges, isLoading: false })
    } catch (err) {
      // Expired or invalid token → send the user back to login for a fresh
      // handoff instead of showing a dead-end error banner.
      if (err.status === 401) { redirectToLogin(); return }
      set({ error: err.message, isLoading: false })
    }
  },

  // Re-size a cone generation's ring to fit its current population. Updates
  // orbitRadius on every node in that generation; the physics constraint then
  // smoothly eases them out/in to the new radius (no position jump).
  resizeConeRing(generation) {
    if (get().currentLayout !== 'cone') return
    const count = get().nodes.reduce(
      (acc, n) => acc + ((n.generation ?? 0) === generation ? 1 : 0), 0,
    )
    if (count === 0) return
    const r = coneRingRadiusForCount(count)
    set((s) => ({
      nodes: s.nodes.map(n => (n.generation ?? 0) === generation ? { ...n, orbitRadius: r } : n),
    }))
  },

  async addNode(fullName, orbitRadius = 320) {
    set({ error: null })
    try {
      const person     = await api.createPerson({ full_name: fullName })
      const generation = (320 - orbitRadius) / 80  // matches RELATIONSHIP_TO_GENERATION formula
      const layout     = getLayout(get().currentLayout)
      const pos        = layout.getInitialPosition({ orbitRadius, generation })
      const node = {
        id: person.id, label: person.full_name,
        category: 'proxy', orbitRadius, generation,
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
      // Grow this generation's cone ring to accommodate the new person.
      get().resizeConeRing(generation)
    } catch (err) {
      set({ error: err.message })
    }
  },

  async removeNode(id) {
    set({ error: null })
    const { edges, nodes } = get()
    const generation = nodes.find((n) => n.id === id)?.generation ?? 0
    const connected = edges.filter((e) => e.sourceId === id || e.targetId === id)
    try {
      await Promise.all(connected.map((e) => api.deleteRelationship(e.id)))
      await api.deletePerson(id)
      set((s) => ({
        nodes: s.nodes.filter((n) => n.id !== id),
        edges: s.edges.filter((e) => e.sourceId !== id && e.targetId !== id),
        selectedNodeId: s.selectedNodeId === id ? null : s.selectedNodeId,
      }))
      // Shrink this generation's cone ring now that someone left it.
      get().resizeConeRing(generation)
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

  selectNode(id)    { set({ selectedNodeId: id }) },
  setSearchQuery(q) { set({ searchQuery: q }) },
}))

export default useGraphStore
