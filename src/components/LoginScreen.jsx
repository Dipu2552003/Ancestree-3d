import { useState } from 'react'
import useGraphStore from '../store/useGraphStore'

export default function LoginScreen() {
  const [tab,         setTab]         = useState('login')
  const [email,       setEmail]       = useState('')
  const [password,    setPassword]    = useState('')
  const [displayName, setDisplayName] = useState('')

  const login     = useGraphStore((s) => s.login)
  const signup    = useGraphStore((s) => s.signup)
  const isLoading = useGraphStore((s) => s.isLoading)
  const error     = useGraphStore((s) => s.error)

  async function handleSubmit(e) {
    e.preventDefault()
    if (tab === 'login') {
      await login(email, password)
    } else {
      await signup(email, password, displayName)
    }
  }

  return (
    <div style={s.overlay}>
      <div style={s.card}>
        <h1 style={s.title}>Family Graph</h1>
        <p style={s.subtitle}>Your family, in 3D space</p>

        {/* tab row */}
        <div style={s.tabs}>
          {['login', 'signup'].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{ ...s.tab, ...(tab === t ? s.tabActive : {}) }}
            >
              {t === 'login' ? 'Log In' : 'Sign Up'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={s.form}>
          {tab === 'signup' && (
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
              required
              style={s.input}
            />
          )}
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
            style={s.input}
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
            style={s.input}
          />

          {error && <p style={s.error}>{error}</p>}

          <button
            type="submit"
            disabled={isLoading}
            style={{ ...s.btn, ...(isLoading ? s.btnLoading : {}) }}
          >
            {isLoading ? 'Please wait…' : tab === 'login' ? 'Log In' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  )
}

const s = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: '#0b0a09',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
    fontFamily: 'system-ui, sans-serif',
  },
  card: {
    width: 340,
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: '36px 32px',
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  title: {
    margin: 0,
    fontSize: 24,
    fontWeight: 700,
    color: '#fff',
    textAlign: 'center',
  },
  subtitle: {
    margin: '-12px 0 0',
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
  },
  tabs: {
    display: 'flex',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    padding: 3,
    gap: 3,
  },
  tab: {
    flex: 1,
    padding: '7px 0',
    border: 'none',
    borderRadius: 6,
    background: 'transparent',
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  tabActive: {
    background: 'rgba(108,99,255,0.3)',
    color: '#fff',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  input: {
    padding: '10px 12px',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8,
    color: '#fff',
    fontSize: 14,
    outline: 'none',
  },
  error: {
    margin: 0,
    fontSize: 12,
    color: '#f87171',
    textAlign: 'center',
  },
  btn: {
    padding: '11px 0',
    background: '#6c63ff',
    border: 'none',
    borderRadius: 8,
    color: '#fff',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'opacity 0.15s',
    marginTop: 4,
  },
  btnLoading: {
    opacity: 0.6,
    cursor: 'default',
  },
}
