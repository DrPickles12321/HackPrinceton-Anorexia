import { useMemo } from 'react'
import { lookupNutrition } from '../lib/nutritionService'

const GOALS = [
  { zone: 'protein',  label: 'Protein',    icon: '🥩', target: 14, color: 'bg-red-400',    track: 'bg-red-100',  desc: 'e.g. eggs, chicken, fish, beans' },
  { zone: 'grain',    label: 'Grains',     icon: '🌾', target: 14, color: 'bg-amber-400',  track: 'bg-amber-100', desc: 'e.g. bread, rice, pasta, oats' },
  { zone: 'produce',  label: 'Vegetables', icon: '🥦', target: 7,  color: 'bg-green-500',  track: 'bg-green-100', desc: 'e.g. salad, broccoli, carrots' },
  { zone: 'dairy',    label: 'Dairy',      icon: '🥛', target: 7,  color: 'bg-blue-400',   track: 'bg-blue-100',  desc: 'e.g. milk, yogurt, cheese' },
  { zone: 'fat',      label: 'Healthy Fats', icon: '🫒', target: 7, color: 'bg-yellow-400', track: 'bg-yellow-100', desc: 'e.g. olive oil, avocado, nuts' },
]

export default function WeeklyGoals({ mealSlots, foodItems, mode = 'parent' }) {
  const zoneCounts = useMemo(() => {
    const counts = { protein: 0, grain: 0, produce: 0, dairy: 0, fat: 0 }
    for (const slot of mealSlots) {
      if (!slot.assigned_food_id) continue
      const food = foodItems.find(f => f.id === slot.assigned_food_id)
      if (!food) continue
      const info = lookupNutrition(food.name, food.category)
      const zone = info.plate_zone
      if (zone in counts) counts[zone]++
    }
    return counts
  }, [mealSlots, foodItems])

  const totalPlanned = Object.values(zoneCounts).reduce((a, b) => a + b, 0)

  return (
    <section className="bg-white border border-gray-200 rounded-xl p-5">
      <header className="mb-4">
        <h2 className="text-base font-semibold text-gray-900">Weekly Food Goals</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          {mode === 'clinician'
            ? 'Planned meals by food group this week vs. recovery targets'
            : 'How the week\'s meals cover each food group'}
        </p>
      </header>

      {totalPlanned === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">No meals planned yet — drag foods onto the grid to start.</p>
      ) : (
        <div className="space-y-4">
          {GOALS.map(({ zone, label, icon, target, color, track, desc }) => {
            const count = zoneCounts[zone] || 0
            const pct = Math.min(100, Math.round((count / target) * 100))
            const met = count >= target
            return (
              <div key={zone}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-800 flex items-center gap-1.5">
                    {icon} {label}
                  </span>
                  <span className={`text-xs font-semibold ${met ? 'text-green-600' : 'text-gray-500'}`}>
                    {count} / {target}
                    {met && <span className="ml-1">✓</span>}
                  </span>
                </div>
                <div className={`h-2.5 rounded-full overflow-hidden ${track}`}>
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${color}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                {mode === 'clinician' && (
                  <p className="text-[10px] text-gray-400 mt-0.5">{desc}</p>
                )}
              </div>
            )
          })}
        </div>
      )}

      {totalPlanned > 0 && (
        <p className="text-xs text-gray-400 mt-4 text-center italic">
          Based on planned meals · {totalPlanned} total slots filled
        </p>
      )}
    </section>
  )
}
