// The backend mounts every route under /api (only /health lives at the root).
// VITE_API_URL is expected to include the /api suffix, but a common deployment
// misconfiguration is to set it to the bare origin (e.g. https://host.onrender.com),
// which makes every request 404. Normalise here so the app works either way:
// strip any trailing slash, then append /api unless it's already the last segment.
function normalizeBase(raw) {
  const trimmed = raw.replace(/\/+$/, '')
  return /\/api$/.test(trimmed) ? trimmed : `${trimmed}/api`
}

const BASE = normalizeBase(import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api')

function getToken() {
  return localStorage.getItem('kg_token')
}

// Turn an HTTP failure into a plain-language message. `serverMsg` is whatever
// the backend put in the response body's `error`/`message` field, which is the
// most useful text when present (e.g. "This family tree is private").
function messageForStatus(status, serverMsg) {
  const detail = serverMsg ? `: ${serverMsg}` : ''
  if (status === 400) return `That request wasn't valid${detail}.`
  if (status === 401) return `Your session has expired. Please sign in again${detail}.`
  if (status === 403) return serverMsg || `You don't have permission to view this family tree.`
  if (status === 404) return `We couldn't find that data${detail}. The API may be misconfigured or the record no longer exists.`
  if (status === 408 || status === 429) return `The server is busy right now${detail}. Please wait a moment and try again.`
  if (status >= 500) return `The server ran into a problem${detail}. Please try again in a little while.`
  return serverMsg || `Request failed (HTTP ${status}).`
}

async function request(path, options = {}) {
  const token = getToken()

  // fetch() only rejects on network-level failures (server unreachable, DNS,
  // or a blocked CORS preflight) — never on an HTTP error status. Surface those
  // as a clear, actionable message instead of the browser's terse "Failed to fetch".
  let res
  try {
    res = await fetch(`${BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    })
  } catch {
    const err = new Error(
      `Couldn't reach the server at ${BASE}. It may be offline or unreachable, ` +
      `or it may be blocking requests from this site (CORS).`
    )
    err.status = 0
    throw err
  }

  if (res.status === 204) return null

  const json = await res.json().catch(() => null)
  if (!res.ok) {
    // Preserve the HTTP status so callers can distinguish auth failures (401)
    // from other errors and redirect to login instead of showing the modal.
    const serverMsg = json?.error ?? json?.message ?? ''
    const err = new Error(messageForStatus(res.status, serverMsg))
    err.status = res.status
    throw err
  }
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
