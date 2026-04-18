import { useMemo } from 'react'
import { lookupMealNutrition, aggregateMealNutrition, lookupNutrition, energyDensityLabel } from '../../lib/nutritionService'
import MacroBreakdown from './MacroBreakdown'
import MicroBreakdown from './MicroBreakdown'
import PlateVisual from './PlateVisual'
import FlagChip from './FlagChip'

const MEAL_ORDER = ['breakfast', 'lunch', 'dinner', 'snack']
const MEAL_LABEL = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snack' }
const DAY_LABEL = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' }

export default function DailyNutritionSummary({ day, mealSlots, foodItems, onClose }) {
  const daySlots = useMemo(
    () => mealSlots.filter(s => s.day === day && s.assigned_food_id),
    [day, mealSlots]
  )

  const mealData = useMemo(() => {
    return MEAL_ORDER.map(mealType => {
      const slot = daySlots.find(s => s.meal_type === mealType)
      if (!slot) return null
      const food = foodItems.find(f => f.id === slot.assigned_food_id)
      if (!food) return null
      const info = lookupNutrition(food.name, food.category)
      return { mealType, food, info }
    }).filter(Boolean)
  }, [daySlots, foodItems])

  const dayTotal = useMemo(() => {
    if (mealData.length === 0) return null
    return aggregateMealNutrition(mealData.map(m => m.info))
  }, [mealData])

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-2xl z-40 flex flex-col overflow-hidden border-l border-gray-200">
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-indigo-50">
        <div>
          <h2 className="text-base font-bold text-gray-900">{DAY_LABEL[day]}</h2>
          <p className="text-xs text-gray-500">Daily nutrition summary</p>
        </div>
        <button
          onClick={onClose}
          aria-label="Close daily summary"
          className="text-gray-400 hover:text-gray-700 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {mealData.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">No meals planned for {DAY_LABEL[day]}.</div>
        ) : (
          <>
            {dayTotal && (
              <div className="bg-indigo-50 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-indigo-900">Day Total</span>
                  <span className="text-lg font-bold text-indigo-700">{dayTotal.calories} kcal</span>
                </div>
                {dayTotal.an_relevant_flags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {dayTotal.an_relevant_flags.map(flag => <FlagChip key={flag} flag={flag} />)}
                  </div>
                )}
                <PlateVisual plateBalance={dayTotal.plateBalance} />
                <MacroBreakdown
                  macros={{ protein_g: dayTotal.protein_g, carbs_g: dayTotal.carbs_g, fat_g: dayTotal.fat_g, fiber_g: dayTotal.fiber_g }}
                  calories={dayTotal.calories}
                />
              </div>
            )}

            {dayTotal && (
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="text-xs font-semibold text-gray-700 mb-3">Micronutrients (day total)</div>
                <MicroBreakdown micros={{ calcium_mg: dayTotal.calcium_mg, iron_mg: dayTotal.iron_mg, vitamin_d_mcg: dayTotal.vitamin_d_mcg }} />
              </div>
            )}

            <div className="space-y-3">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Per Meal</div>
              {mealData.map(({ mealType, food, info }) => (
                <div key={mealType} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-gray-700">{MEAL_LABEL[mealType]}</span>
                    <span className="text-xs text-gray-500">{info.calories} kcal</span>
                  </div>
                  <div className="text-sm text-gray-800 mb-2">{food.name}</div>
                  {info.an_relevant_flags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {info.an_relevant_flags.map(flag => <FlagChip key={flag} flag={flag} />)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="p-3 border-t border-gray-100">
        <p className="text-[10px] text-gray-400 text-center">Estimated values based on typical serving sizes</p>
      </div>
    </div>
  )
}
