// Session handoff from the frontend (Next.js, port 3000).
//
// This app and the frontend run on different origins, so localStorage can't be
// shared. When the user clicks the 3D icon in the frontend, it opens this app
// with the JWT in the URL hash (#token=<jwt>). We persist it here — BEFORE the
// Zustand store initialises and reads `kg_token` — then strip it from the URL
// so the token doesn't linger in the address bar or browser history.
//
// Imported first in main.jsx; ES modules evaluate in import order, so this runs
// before the store module is pulled in via <App />.

const match = window.location.hash.match(/token=([^&]+)/)
if (match) {
  localStorage.setItem('kg_token', decodeURIComponent(match[1]))
  history.replaceState(null, '', window.location.pathname + window.location.search)
}
