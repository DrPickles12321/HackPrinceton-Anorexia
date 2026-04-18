import { useMemo } from 'react'
import { computeSupplementRecommendations } from '../lib/insights'

export default function SupplementChecklist({ mealSlots, foodItems, selectedDay, checkedSupplements, onToggleChecked, prescribedSupplements = [] }) {
  const recommendations = useMemo(
    () => computeSupplementRecommendations({ mealSlots: mealSlots.filter(slot => slot.day === selectedDay), foodItems }),
    [mealSlots, foodItems, selectedDay]
  )

  const items = prescribedSupplements.length > 0
    ? prescribedSupplements.map(name => ({ nutrient: name }))
    : recommendations.length > 0
      ? recommendations
      : [
          { nutrient: 'Calcium + D3' },
          { nutrient: 'Iron' },
          { nutrient: 'Zinc' },
          { nutrient: 'Multivitamin' },
        ]

  return (
    <div style={{ position: 'relative', paddingTop: 14 }}>
      {/* Tape label */}
      <div style={{
        position: 'absolute', top: 0, left: '50%',
        transform: 'translateX(-50%) rotate(-1deg)',
        background: '#e8dcc8',
        borderRadius: 4,
        width: 64, height: 14,
        zIndex: 1,
        boxShadow: '0 1px 3px rgba(0,0,0,0.10)',
      }} />

      {/* Notebook card */}
      <div style={{
        background: 'white',
        border: '1px solid var(--border)',
        borderRadius: 14,
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(39,23,6,0.06)',
      }}>
        {/* Header */}
        <div style={{
          padding: '12px 14px 8px',
          borderBottom: '1px solid var(--border)',
        }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--coral)', fontFamily: "'Outfit', sans-serif" }}>
            Daily Supplements
          </span>
        </div>

        {/* Ruled content with margin line */}
        <div style={{
          backgroundImage: 'repeating-linear-gradient(transparent, transparent 27px, #e8e0d4 27px, #e8e0d4 28px)',
          backgroundSize: '100% 28px',
          backgroundPositionY: '4px',
          padding: '10px 12px 12px 0',
          display: 'flex',
        }}>
          {/* Red margin line */}
          <div style={{ width: 2, background: '#f4b8b8', flexShrink: 0, marginLeft: 12, marginRight: 10 }} />

          {/* Items */}
          <div style={{ flex: 1 }}>
            {items.map((rec, i) => {
              const checked = checkedSupplements?.has(rec.nutrient)
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  height: 28,
                }}>
                  <button
                    onClick={() => onToggleChecked?.(rec.nutrient)}
                    style={{
                      width: 16, height: 16, borderRadius: '50%',
                      border: `1.5px solid var(--coral)`,
                      background: checked ? 'var(--coral)' : 'transparent',
                      cursor: 'pointer', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      padding: 0,
                      transition: 'all 0.15s',
                    }}
                    aria-label={`Toggle ${rec.nutrient}`}
                  >
                    {checked && <span style={{ color: 'white', fontSize: 10, lineHeight: 1, fontWeight: 700 }}>✓</span>}
                  </button>
                  <span style={{
                    fontSize: 12, color: checked ? 'var(--text-light)' : 'var(--text-dark)',
                    textDecoration: checked ? 'line-through' : 'none',
                    fontFamily: "'Outfit', sans-serif",
                    transition: 'all 0.15s',
                  }}>{rec.nutrient}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '6px 12px 8px',
          borderTop: '1px solid var(--border)',
          fontSize: 9, color: 'var(--text-light)',
          fontStyle: 'italic', lineHeight: 1.4,
          fontFamily: "'Outfit', sans-serif",
        }}>
          Not a substitute for medical advice · Resets daily
        </div>
      </div>
    </div>
  )
}
