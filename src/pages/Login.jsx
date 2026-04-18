import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Login() {
  const navigate = useNavigate()

  useEffect(() => {
    const r = localStorage.getItem('demoRole')
    if (r === 'parent') navigate('/parent/daily', { replace: true })
    if (r === 'clinician') navigate('/clinician', { replace: true })
  }, [navigate])

  function pickRole(role) {
    localStorage.setItem('demoRole', role)
    localStorage.setItem('demoFamilyId', '11111111-1111-1111-1111-111111111111')
    navigate(role === 'parent' ? '/parent/daily' : '/clinician', { replace: true })
  }

  return (
    <div style={{
      minHeight: '100svh',
      display: 'flex',
      overflow: 'hidden',
    }}>
      {/* Left — brand panel */}
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

      {/* Right — login */}
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
          <div style={{ marginBottom: 42 }}>
            <h2 className="font-lora" style={{
              fontSize: 32, fontWeight: 400, color: 'var(--text-dark)',
              letterSpacing: '-0.3px', marginBottom: 10, lineHeight: 1.15,
            }}>
              Welcome back
            </h2>
            <p style={{ fontSize: 15, color: 'var(--text-mid)', lineHeight: 1.6 }}>
              Choose how you'd like to continue today.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <RoleCard
              onClick={() => pickRole('parent')}
              icon="👨‍👩‍👧"
              iconBg="var(--coral-light)"
              title="Continue as Parent"
              subtitle="Plan meals, log how they went"
              accentColor="var(--coral)"
              hoverShadow="rgba(184,85,53,0.15)"
            />
            <RoleCard
              onClick={() => pickRole('clinician')}
              icon="👩‍⚕️"
              iconBg="var(--mint-light)"
              title="Continue as Clinician"
              subtitle="View the board and track weekly patterns"
              accentColor="var(--mint)"
              hoverShadow="rgba(72,122,103,0.15)"
            />
          </div>

          <p style={{
            textAlign: 'center', color: 'var(--text-light)',
            fontSize: 12, marginTop: 32, lineHeight: 1.6,
          }}>
            Demo mode · No account required
          </p>
        </div>
      </div>
    </div>
  )
}

function RoleCard({ onClick, icon, iconBg, title, subtitle, accentColor, hoverShadow }) {
  return (
    <button
      onClick={onClick}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = accentColor
        e.currentTarget.style.boxShadow = `0 8px 28px ${hoverShadow}`
        e.currentTarget.style.transform = 'translateY(-2px)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--border)'
        e.currentTarget.style.boxShadow = '0 2px 10px rgba(39,23,6,0.06)'
        e.currentTarget.style.transform = 'translateY(0)'
      }}
      style={{
        background: 'white', border: '1.5px solid var(--border)',
        borderRadius: 20, padding: '20px 22px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        cursor: 'pointer', transition: 'all 0.2s ease',
        boxShadow: '0 2px 10px rgba(39,23,6,0.06)', textAlign: 'left', width: '100%',
        fontFamily: "'Lato', sans-serif",
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{
          width: 50, height: 50, borderRadius: 14, background: iconBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22, flexShrink: 0,
        }}>{icon}</div>
        <div>
          <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-dark)', marginBottom: 3 }}>
            {title}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-light)' }}>{subtitle}</div>
        </div>
      </div>
      <span style={{ color: accentColor, fontSize: 18, marginLeft: 12, opacity: 0.8 }}>→</span>
    </button>
  )
}
