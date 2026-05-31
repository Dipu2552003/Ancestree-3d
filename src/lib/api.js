const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api'

function getToken() {
  return localStorage.getItem('kg_token')
}

async function request(path, options = {}) {
  const token = getToken()
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  if (res.status === 204) return null

  const json = await res.json().catch(() => ({ error: res.statusText }))
  if (!res.ok) throw new Error(json.error ?? json.message ?? res.statusText)
  return json
}

export const api = {
  login:  (email, password) =>
    request('/auth/login',  { method: 'POST', body: JSON.stringify({ email, password }) }),

  signup: (email, password, display_name) =>
    request('/auth/signup', { method: 'POST', body: JSON.stringify({ email, password, display_name }) }),

  me: () => request('/auth/me'),

  getGraph: () => request('/graph'),

  createPerson: (data) =>
    request('/persons', { method: 'POST', body: JSON.stringify(data) }),

  deletePerson: (id) =>
    request(`/persons/${id}`, { method: 'DELETE' }),

  updatePerson: (id, data) =>
    request(`/persons/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  createRelationship: (data) =>
    request('/relationships', { method: 'POST', body: JSON.stringify(data) }),

  deleteRelationship: (id) =>
    request(`/relationships/${id}`, { method: 'DELETE' }),

  searchPersons: (q) =>
    request(`/search?q=${encodeURIComponent(q)}`),
}
