// Auth fallback for direct visits.
//
// This app has no login screen of its own — the session is handed over from the
// frontend (Next.js) via the URL hash (see bootstrapAuth.js). If someone opens
// this app directly without a token, or their token has expired (API returns
// 401), we send them to the frontend's login page. After they log in there, the
// frontend re-opens this app with a fresh token in the hash.

// VITE_FRONTEND_URL points at the Next.js app (no trailing slash needed).
const FRONTEND_URL = (import.meta.env.VITE_FRONTEND_URL ?? 'http://localhost:3000').replace(/\/+$/, '')

export function redirectToLogin() {
  // Drop any stale/invalid token so a fresh login can't be short-circuited.
  localStorage.removeItem('kg_token')
  window.location.href = `${FRONTEND_URL}/login`
}
