import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from '../firebase'
import { useAuth } from '../contexts/AuthContext'
import { useRealtimeStatus } from '../contexts/RealtimeContext'
import { useFirebaseData } from '../contexts/FirebaseDataContext'
import LiveIndicator from './LiveIndicator'

const PARENT_TABS = [
  { to: '/parent/daily',  label: 'Daily' },
  { to: '/parent/weekly', label: 'Weekly' },
  { to: '/parent/stats',  label: 'Insights' },
]

export default function Navbar() {
  const { status } = useRealtimeStatus()
  const { role } = useAuth()
  const { familyCode } = useFirebaseData()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const isParent    = pathname.startsWith('/parent')
  const isClinician = pathname.startsWith('/clinician')

  return (
    <nav style={{
      background: 'rgba(255,255,255,0.92)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--border)',
      position: 'sticky', top: 0, zIndex: 40,
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60 }}>

          {/* Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <div style={{
              width: 36, height: 36,
              background: 'linear-gradient(135deg, var(--coral) 0%, var(--pink) 100%)',
              borderRadius: 11, display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 17, flexShrink: 0,
              boxShadow: '0 2px 8px rgba(184,85,53,0.3)',
            }}>🍽️</div>
            <span className="font-lora" style={{
              fontWeight: 500, fontSize: 19, color: 'var(--text-dark)',
              letterSpacing: '-0.3px', lineHeight: 1,
            }}>Plate Together</span>
          </div>

          {/* Parent sub-tabs (center) */}
          {isParent && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 2,
              background: 'var(--surface-warm)', padding: '3px',
              borderRadius: 13, border: '1.5px solid var(--border)',
            }}>
              {PARENT_TABS.map(tab => {
                const isActive = pathname === tab.to || pathname.startsWith(tab.to + '/')
                return (
                  <NavLink
                    key={tab.to}
                    to={tab.to}
                    style={{
                      padding: '6px 18px', borderRadius: 10,
                      fontSize: 13, fontWeight: 500,
                      textDecoration: 'none', transition: 'all 0.15s',
                      color: isActive ? 'white' : 'var(--text-mid)',
                      background: isActive
                        ? 'linear-gradient(135deg, var(--coral) 0%, var(--pink) 100%)'
                        : 'transparent',
                      boxShadow: isActive ? '0 2px 8px rgba(184,85,53,0.28)' : 'none',
                    }}
                    onMouseEnter={e => {
                      if (!isActive) {
                        e.currentTarget.style.background = 'rgba(184,85,53,0.10)'
                        e.currentTarget.style.color = 'var(--text-dark)'
                      }
                    }}
                    onMouseLeave={e => {
                      if (!isActive) {
                        e.currentTarget.style.background = 'transparent'
                        e.currentTarget.style.color = 'var(--text-mid)'
                      }
                    }}
                  >
                    {tab.label}
                  </NavLink>
                )
              })}
            </div>
          )}

          {/* Right side */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
            {isParent && familyCode && (
              <div style={{
                fontSize: 11, color: 'var(--text-light)',
                background: 'var(--surface-warm)', border: '1px solid var(--border)',
                borderRadius: 8, padding: '4px 10px', letterSpacing: '0.5px',
              }}>
                Code: <span style={{ fontWeight: 700, color: 'var(--text-mid)', letterSpacing: '1px' }}>{familyCode}</span>
              </div>
            )}
            <LiveIndicator status={status} />

            <button
              onClick={() => { localStorage.removeItem('demoRole'); signOut(auth) }}
              style={{
                fontSize: 12, color: 'var(--text-light)', background: 'none',
                border: 'none', cursor: 'pointer', padding: 0,
                fontFamily: "'Outfit', sans-serif",
                transition: 'color 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text-mid)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-light)'}
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
