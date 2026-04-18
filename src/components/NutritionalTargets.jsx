import { useState } from 'react'
import { useNutritionalTargets } from '../contexts/NutritionalTargetsContext'

const NUTRIENTS = [
  { key: 'protein',       label: 'Protein',          icon: '🥩', color: 'var(--coral)',  bg: 'var(--coral-light)',  border: 'var(--coral-mid)'  },
  { key: 'carbs',         label: 'Carbs',             icon: '🌾', color: 'var(--peach)',  bg: 'var(--peach-light)',  border: 'var(--peach-mid)'  },
  { key: 'fruitsVeggies', label: 'Fruits & Veggies',  icon: '🥦', color: 'var(--mint)',   bg: 'var(--mint-light)',   border: 'var(--mint-mid)'   },
]

export default function NutritionalTargets() {
  const { targets, saveTargets } = useNutritionalTargets()
  const [draft, setDraft] = useState(() => ({ ...targets }))
  const [open, setOpen] = useState(false)
  const [saved, setSaved] = useState(false)

  function handleChange(key, raw) {
    const val = Math.max(0, parseInt(raw, 10) || 0)
    setDraft(prev => ({ ...prev, [key]: val }))
  }

  function handleSave() {
    saveTargets(draft)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <section style={{
      background: 'white',
      borderRadius: 20,
      border: '1.5px solid var(--border)',
      boxShadow: '0 2px 12px rgba(39,23,6,0.06)',
      overflow: 'hidden',
    }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', padding: '18px 24px',
          background: 'none', border: 'none', cursor: 'pointer',
          fontFamily: "'Outfit', sans-serif",
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 11,
            background: 'var(--coral-light)', border: '1px solid var(--coral-mid)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
          }}>🎯</div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-dark)' }}>
              Daily Nutritional Targets
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-light)', marginTop: 1 }}>
              Set per-day goals — weekly goals update automatically
            </div>
          </div>
        </div>
        <span style={{
          fontSize: 18, color: 'var(--text-light)',
          transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s',
          display: 'inline-block',
        }}>▾</span>
      </button>

      {open && (
        <div style={{ padding: '0 24px 24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {NUTRIENTS.map(n => (
              <div key={n.key} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: n.bg, borderRadius: 14,
                border: `1px solid ${n.border}`,
                padding: '14px 18px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 20 }}>{n.icon}</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: n.color }}>{n.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-light)', marginTop: 1 }}>per day</div>
                  </div>
                </div>
                <div style={{ position: 'relative', width: 110 }}>
                  <input
                    type="number"
                    min="0"
                    value={draft[n.key]}
                    onChange={e => handleChange(n.key, e.target.value)}
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      paddingRight: 28, paddingLeft: 12,
                      paddingTop: 9, paddingBottom: 9,
                      borderRadius: 10,
                      border: `1.5px solid ${n.border}`,
                      background: 'white',
                      fontSize: 16, fontWeight: 700,
                      color: 'var(--text-dark)',
                      fontFamily: "'Outfit', sans-serif",
                      outline: 'none', textAlign: 'right',
                    }}
                    onFocus={e => { e.target.style.borderColor = n.color }}
                    onBlur={e => { e.target.style.borderColor = n.border }}
                  />
                  <span style={{
                    position: 'absolute', right: 10, top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: 12, color: 'var(--text-light)', fontWeight: 500,
                    pointerEvents: 'none',
                  }}>g</span>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 18 }}>
            <button
              onClick={handleSave}
              style={{
                padding: '10px 28px', borderRadius: 12, border: 'none',
                background: 'linear-gradient(135deg, var(--coral) 0%, var(--pink) 100%)',
                color: 'white', fontWeight: 600, fontSize: 14, cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(184,85,53,0.28)',
                fontFamily: "'Outfit', sans-serif", transition: 'opacity 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.opacity = '0.88' }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
            >
              Save Targets
            </button>
            {saved && (
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--mint)' }}>
                ✓ Saved!
              </span>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
