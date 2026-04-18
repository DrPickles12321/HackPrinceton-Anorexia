import { useMemo } from 'react'
import { computeInsights, computeNutritionInsights } from '../lib/insights'
import { FLAG_CONFIG } from './nutrition/FlagChip'

const MEAL_LABELS = { breakfast: 'breakfasts', lunch: 'lunches', dinner: 'dinners', snack: 'snacks' }
const CATEGORY_LABELS = { familiar: 'Familiar foods', working_on: 'Working-on foods', challenge: 'Challenge foods' }

function StatCard({ icon, label, value, subtext, tone = 'neutral' }) {
  const toneClasses = {
    neutral: 'bg-white border-gray-200',
    good:    'bg-green-50 border-green-200',
    warn:    'bg-yellow-50 border-yellow-200',
    alert:   'bg-red-50 border-red-200',
  }
  return (
    <div className={`border rounded-lg p-4 ${toneClasses[tone]}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xl" aria-hidden="true">{icon}</span>
        <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">{label}</span>
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      {subtext && <div className="text-xs text-gray-500 mt-1">{subtext}</div>}
    </div>
  )
}

export default function WeeklyInsights({ mealLogs, foodItems, mealSlots }) {
  const insights = useMemo(
    () => computeInsights({ mealLogs, foodItems, mealSlots }),
    [mealLogs, foodItems, mealSlots]
  )
  const nutritionInsights = useMemo(
    () => computeNutritionInsights({ mealSlots, foodItems }),
    [mealSlots, foodItems]
  )

  return (
    <section className="mt-8 bg-gray-50 rounded-xl p-6">
      <header className="mb-4">
        <h2 className="text-lg font-semibold">Weekly Insights</h2>
        <p className="text-xs text-gray-500">
          Descriptive summary of this week's logs. Not a clinical recommendation.
        </p>
      </header>

      {insights.totalLogs === 0 ? (
        <div className="text-center py-8 text-gray-500">No meals logged yet this week.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon="📊"
            label="Meals logged"
            value={insights.totalLogs}
            subtext="in the last 7 days"
            tone="neutral"
          />
          <StatCard
            icon="✅"
            label="Okay"
            value={insights.okay}
            subtext={`${Math.round((insights.okay / insights.totalLogs) * 100)}% of logged meals`}
            tone="good"
          />
          <StatCard
            icon="😓"
            label="Difficult"
            value={insights.difficult + insights.refused}
            subtext={
              insights.hardestMealType
                ? `Most often at ${MEAL_LABELS[insights.hardestMealType.mealType]} (${insights.hardestMealType.count})`
                : 'None this week'
            }
            tone={insights.difficult + insights.refused > 0 ? 'warn' : 'neutral'}
          />
          <StatCard
            icon="🎯"
            label="Refused foods"
            value={insights.refused}
            subtext={
              insights.topRefusedCategory
                ? `Mostly ${CATEGORY_LABELS[insights.topRefusedCategory.category].toLowerCase()} (${insights.topRefusedCategory.count})`
                : 'None this week'
            }
            tone={insights.refused > 0 ? 'alert' : 'neutral'}
          />
          {nutritionInsights.avgDailyCalories !== null && (
            <StatCard
              icon="⚡"
              label="Avg daily energy"
              value={`${nutritionInsights.avgDailyCalories} kcal`}
              subtext="estimated from planned meals"
              tone="neutral"
            />
          )}
          {nutritionInsights.topRecoveryNutrient && (
            <StatCard
              icon={FLAG_CONFIG[nutritionInsights.topRecoveryNutrient.flag]?.icon || '🌟'}
              label="Top recovery nutrient"
              value={FLAG_CONFIG[nutritionInsights.topRecoveryNutrient.flag]?.label || nutritionInsights.topRecoveryNutrient.flag}
              subtext={`present in ${nutritionInsights.topRecoveryNutrient.count} planned meal${nutritionInsights.topRecoveryNutrient.count !== 1 ? 's' : ''}`}
              tone="good"
            />
          )}
        </div>
      )}
    </section>
  )
}
