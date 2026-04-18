import { useMemo } from 'react'
import { lookupNutrition } from '../lib/nutritionService'
import { useNutritionalTargets } from '../contexts/NutritionalTargetsContext'

const PRODUCE_G_PER_SERVING = 80

const NUTRIENTS = [
  {
    key: 'protein',
    label: 'Protein',
    icon: '🥩',
    color: 'var(--coral)',
    bg: 'var(--coral-light)',
    border: 'var(--coral-mid)',
    barEnd: '#DBA898',
    getActual: info => info.protein_g || 0,
  },
  {
    key: 'carbs',
    label: 'Carbs',
    icon: '🌾',
    color: 'var(--peach)',
    bg: 'var(--peach-light)',
    border: 'var(--peach-mid)',
    barEnd: '#E0C07C',
    getActual: info => info.carbs_g || 0,
  },
  {
    key: 'fruitsVeggies',
    label: 'Fruits & Veggies',
    icon: '🥦',
    color: 'var(--mint)',
    bg: 'var(--mint-light)',
    border: 'var(--mint-mid)',
    barEnd: '#8EC0B0',
    getActual: info => info.plate_zone === 'produce' ? PRODUCE_G_PER_SERVING : 0,
  },
]

export default function WeeklyGoals({ mealSlots, foodItems, mode = 'parent', allMealItems }) {
  const { targets } = useNutritionalTargets()

  const weeklyTargets = useMemo(() => ({
    protein:       (targets.protein       || 0) * 7,
    carbs:         (targets.carbs         || 0) * 7,
    fruitsVeggies: (targets.fruitsVeggies || 0) * 7,
  }), [targets])

  const actuals = useMemo(() => {
    const sums = { protein: 0, carbs: 0, fruitsVeggies: 0 }
    const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack']

    if (allMealItems && Object.keys(allMealItems).length > 0) {
      for (const dateStr of Object.keys(allMealItems)) {
        const dayMeals = allMealItems[dateStr] || {}
        for (const mealType of MEAL_TYPES) {
          const items = dayMeals[mealType] || []
          for (const item of items) {
            const info = lookupNutrition(item.name, item.category || 'working_on')
            for (const n of NUTRIENTS) sums[n.key] += n.getActual(info)
          }
        }
      }
    } else {
      for (const slot of mealSlots) {
        if (!slot.assigned_food_id) continue
        const food = foodItems.find(f => f.id === slot.assigned_food_id)
        if (!food) continue
        const info = lookupNutrition(food.name, food.category)
        for (const n of NUTRIENTS) sums[n.key] += n.getActual(info)
      }
    }

    return {
      protein:       Math.round(sums.protein),
      carbs:         Math.round(sums.carbs),
      fruitsVeggies: Math.round(sums.fruitsVeggies),
    }
  }, [mealSlots, foodItems, allMealItems])

  const totalFilled = (allMealItems && Object.keys(allMealItems).length > 0)
    ? Object.values(allMealItems).reduce((acc, dayMeals) =>
        acc + ['breakfast', 'lunch', 'dinner', 'snack'].filter(
          mt => Array.isArray(dayMeals[mt]) && dayMeals[mt].length > 0
        ).length, 0)
    : mealSlots.filter(s => s.assigned_food_id).length

  return (
    <section style={{
      background: 'white',
      borderRadius: 20,
      border: '1.5px solid var(--border)',
      boxShadow: '0 2px 12px rgba(39,23,6,0.06)',
      padding: '20px 24px',
    }}>
      <header style={{ marginBottom: 18 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-dark)', marginBottom: 3 }}>
          Weekly Nutritional Goals
        </h2>
        <p style={{ fontSize: 12, color: 'var(--text-light)' }}>
          {mode === 'clinician'
            ? 'Planned meals vs. weekly targets (daily goal × 7)'
            : "This week's planned meals vs. nutritional targets"}
        </p>
      </header>

      {totalFilled === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--text-light)', textAlign: 'center', padding: '24px 0' }}>
          No meals planned yet — drag foods onto the grid to start.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {NUTRIENTS.map(n => {
            const actual = actuals[n.key]
            const target = weeklyTargets[n.key]
            const pct = target > 0 ? Math.min(100, Math.round((actual / target) * 100)) : 0
            const met = actual >= target

            return (
              <div key={n.key} style={{
                background: n.bg,
                borderRadius: 14,
                border: `1px solid ${n.border}`,
                padding: '14px 16px',
              }}>
                <div style={{
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between', marginBottom: 10,
                }}>
                  <span style={{
                    display: 'flex', alignItems: 'center', gap: 7,
                    fontWeight: 600, fontSize: 13, color: n.color,
                  }}>
                    <span style={{ fontSize: 17 }}>{n.icon}</span>
                    {n.label}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: met ? 'var(--mint)' : n.color }}>
                    {actual}g
                    <span style={{ fontWeight: 400, color: 'var(--text-light)', fontSize: 12 }}> / {target}g</span>
                    {met && <span style={{ marginLeft: 5, fontSize: 12 }}>✓</span>}
                  </span>
                </div>

                <div style={{
                  height: 8, borderRadius: 999,
                  background: 'rgba(255,255,255,0.7)',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%', borderRadius: 999,
                    width: `${pct}%`,
                    background: met
                      ? 'var(--mint)'
                      : `linear-gradient(90deg, ${n.color} 0%, ${n.barEnd} 100%)`,
                    transition: 'width 0.5s ease',
                  }} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
                  <span style={{ fontSize: 10, color: 'var(--text-light)' }}>{pct}% of weekly target</span>
                  <span style={{ fontSize: 10, color: 'var(--text-light)' }}>
                    {Math.max(0, target - actual)}g remaining
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {totalFilled > 0 && (
        <p style={{ fontSize: 11, color: 'var(--text-light)', textAlign: 'center', marginTop: 14, fontStyle: 'italic' }}>
          Based on {totalFilled} logged meal{totalFilled !== 1 ? 's' : ''} this week
        </p>
      )}
    </section>
  )
}
