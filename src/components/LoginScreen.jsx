import { useState } from 'react'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from 'firebase/auth'
import { ref, set } from 'firebase/database'
import { auth, db } from '../firebase'

export default function LoginScreen() {
  const [mode, setMode]       = useState('signin')   // 'signin' | 'register'
  const [role, setRole]       = useState(null)        // 'parent' | 'clinician'
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!role) { setError('Please select a role first.'); return }
    setError('')
    setLoading(true)
    try {
      let cred
      if (mode === 'signin') {
        cred = await signInWithEmailAndPassword(auth, email, password)
        await set(ref(db, `users/${cred.user.uid}/role`), role)
      } else {
        cred = await createUserWithEmailAndPassword(auth, email, password)
        const { uid } = cred.user
        const writes = {
          [`users/${uid}/role`]:  role,
          [`users/${uid}/email`]: email,
        }
        if (role === 'parent') {
          const code = generateFamilyCode()
          writes[`users/${uid}/familyCode`]  = code
          writes[`familyCodes/${code}`]      = uid
        }
        await Promise.all(Object.entries(writes).map(([path, val]) => set(ref(db, path), val)))
      }
    } catch (err) {
      setError(friendlyError(err.code))
    } finally {
      setLoading(false)
    }
  }

  function generateFamilyCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  }

  return (
    <div style={{
      minHeight: '100svh',
      display: 'flex',
      overflow: 'hidden',
    }}>
      {/* Left brand panel */}
      <div style={{
        flex: '0 0 42%',
        background: 'linear-gradient(155deg, #271706 0%, #3E200C 55%, #2A1808 100%)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '72px 56px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', width: 480, height: 480, borderRadius: '50%',
          top: -160, right: -160,
          background: 'radial-gradient(circle, rgba(184,85,53,0.22) 0%, transparent 65%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', width: 360, height: 360, borderRadius: '50%',
          bottom: -100, left: -100,
          background: 'radial-gradient(circle, rgba(72,122,103,0.18) 0%, transparent 65%)',
          pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 54, height: 54, borderRadius: 17,
            background: 'rgba(184,85,53,0.28)',
            border: '1px solid rgba(184,85,53,0.38)',
            fontSize: 26, marginBottom: 32,
          }}>🍽️</div>

          <h1 className="font-lora" style={{
            fontSize: 50, fontWeight: 400, lineHeight: 1.08,
            color: '#F5EAD8', letterSpacing: '-0.5px', marginBottom: 22,
          }}>
            Plate<br />Together
          </h1>

          <p style={{
            fontSize: 16, color: 'rgba(245,234,216,0.60)',
            lineHeight: 1.75, maxWidth: 270, marginBottom: 52,
          }}>
            Shared meal support for families navigating eating disorder recovery.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { icon: '📅', text: 'Plan meals together, week by week' },
              { icon: '✏️', text: 'Log how each meal honestly went' },
              { icon: '👩‍⚕️', text: 'Stay in sync with your care team' },
            ].map(item => (
              <div key={item.text} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <span style={{
                  width: 34, height: 34, borderRadius: 10, fontSize: 15,
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.10)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>{item.icon}</span>
                <span style={{ fontSize: 14, color: 'rgba(245,234,216,0.65)', lineHeight: 1.45 }}>
                  {item.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div style={{
        flex: 1,
        background: '#F3ECE2',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 40px',
        position: 'relative',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(circle at 75% 15%, rgba(184,85,53,0.07) 0%, transparent 48%), radial-gradient(circle at 25% 85%, rgba(72,122,103,0.07) 0%, transparent 48%)',
          pointerEvents: 'none',
        }} />

        <div style={{ width: '100%', maxWidth: 380, position: 'relative' }}>
          <div style={{ marginBottom: 32 }}>
            <h2 className="font-lora" style={{
              fontSize: 32, fontWeight: 400, color: 'var(--text-dark)',
              letterSpacing: '-0.3px', marginBottom: 8, lineHeight: 1.15,
            }}>
              {mode === 'signin' ? 'Welcome back' : 'Create account'}
            </h2>
            <p style={{ fontSize: 14, color: 'var(--text-mid)', lineHeight: 1.6 }}>
              {mode === 'signin'
                ? 'Sign in to continue to Plate Together.'
                : 'Set up your account to get started.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Role toggle */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-mid)', letterSpacing: '0.5px', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
                I am a
              </label>
              <div style={{
                display: 'flex', gap: 10,
              }}>
                {['parent', 'clinician'].map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    style={{
                      flex: 1, padding: '10px 0', borderRadius: 12, border: '1.5px solid',
                      cursor: 'pointer', fontSize: 14, fontWeight: 600,
                      fontFamily: "'Outfit', sans-serif",
                      transition: 'all 0.15s',
                      borderColor: role === r ? (r === 'parent' ? 'var(--coral)' : 'var(--mint)') : 'var(--border)',
                      background: role === r
                        ? (r === 'parent'
                          ? 'linear-gradient(135deg, var(--coral) 0%, var(--pink) 100%)'
                          : 'linear-gradient(135deg, var(--mint) 0%, #306050 100%)')
                        : 'white',
                      color: role === r ? 'white' : 'var(--text-mid)',
                      boxShadow: role === r
                        ? (r === 'parent' ? '0 2px 8px rgba(184,85,53,0.28)' : '0 2px 8px rgba(72,122,103,0.28)')
                        : 'none',
                    }}
                  >
                    {r === 'parent' ? '👨‍👩‍👧 Parent' : '👩‍⚕️ Clinician'}
                  </button>
                ))}
              </div>
            </div>

            {/* Email */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-mid)', letterSpacing: '0.5px', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                style={{
                  width: '100%', padding: '11px 14px', borderRadius: 12,
                  border: '1.5px solid var(--border)',
                  background: 'white', fontSize: 14, color: 'var(--text-dark)',
                  fontFamily: "'Outfit', sans-serif",
                  outline: 'none', boxSizing: 'border-box',
                  transition: 'border-color 0.15s',
                }}
                onFocus={e => e.target.style.borderColor = 'var(--coral)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
            </div>

            {/* Password */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-mid)', letterSpacing: '0.5px', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                style={{
                  width: '100%', padding: '11px 14px', borderRadius: 12,
                  border: '1.5px solid var(--border)',
                  background: 'white', fontSize: 14, color: 'var(--text-dark)',
                  fontFamily: "'Outfit', sans-serif",
                  outline: 'none', boxSizing: 'border-box',
                  transition: 'border-color 0.15s',
                }}
                onFocus={e => e.target.style.borderColor = 'var(--coral)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
            </div>

            {/* Error */}
            {error && (
              <div style={{
                background: '#FEF0EE', border: '1px solid #F5C4B4',
                borderRadius: 10, padding: '10px 14px',
                fontSize: 13, color: 'var(--coral)', lineHeight: 1.5,
              }}>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '13px 0', borderRadius: 13, border: 'none',
                background: loading
                  ? 'rgba(232,115,90,0.5)'
                  : 'linear-gradient(135deg, var(--coral) 0%, var(--pink) 100%)',
                color: 'white', fontSize: 15, fontWeight: 600,
                fontFamily: "'Outfit', sans-serif",
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: loading ? 'none' : '0 4px 14px rgba(184,85,53,0.32)',
                transition: 'all 0.15s',
                marginTop: 4,
              }}
            >
              {loading
                ? (mode === 'signin' ? 'Signing in…' : 'Creating account…')
                : (mode === 'signin' ? 'Sign In' : 'Create Account')}
            </button>
          </form>

          {/* Mode toggle */}
          <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-mid)', marginTop: 20 }}>
            {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
            <button
              type="button"
              onClick={() => { setMode(mode === 'signin' ? 'register' : 'signin'); setError('') }}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--coral)', fontWeight: 600, fontSize: 13,
                fontFamily: "'Outfit', sans-serif", padding: 0,
              }}
            >
              {mode === 'signin' ? 'Create account' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}

function friendlyError(code) {
  switch (code) {
    case 'auth/invalid-email':           return 'That email address is not valid.'
    case 'auth/user-not-found':          return 'No account found with that email.'
    case 'auth/wrong-password':          return 'Incorrect password. Please try again.'
    case 'auth/invalid-credential':      return 'Email or password is incorrect.'
    case 'auth/email-already-in-use':    return 'An account with that email already exists.'
    case 'auth/weak-password':           return 'Password must be at least 6 characters.'
    case 'auth/too-many-requests':       return 'Too many attempts. Please wait a moment.'
    case 'auth/network-request-failed':  return 'Network error. Check your connection.'
    default:                             return 'Something went wrong. Please try again.'
  }
}
