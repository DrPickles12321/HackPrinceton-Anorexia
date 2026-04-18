import { useMemo } from 'react'
import { lookupMealNutrition, aggregateMealNutrition, energyDensityLabel } from '../lib/nutritionService'
import MacroBreakdown from './nutrition/MacroBreakdown'
import MicroBreakdown from './nutrition/MicroBreakdown'
import PlateVisual from './nutrition/PlateVisual'
import EnergyDensityBar from './nutrition/EnergyDensityBar'
import FlagChip from './nutrition/FlagChip'

export default function MealNutritionPanel({ foods, mode = 'parent' }) {
  const nutrition = useMemo(() => {
    if (!foods || foods.length === 0) return null
    return aggregateMealNutrition(lookupMealNutrition(foods))
  }, [foods])

  if (!nutrition) return null

  const energyLevel = energyDensityLabel(nutrition.calories)
  const flags = nutrition.an_relevant_flags

  return (
    <div className="bg-gray-50 rounded-xl p-4 space-y-4 mt-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-800">Meal Nutrition</h3>
        <span className="text-xs text-gray-400 italic">Estimated values</span>
      </div>

      {mode === 'clinician' && (
        <div className="text-xs text-gray-600 font-medium">{nutrition.calories} kcal total</div>
      )}
      <EnergyDensityBar level={energyLevel} />

      {flags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {flags.map(flag => <FlagChip key={flag} flag={flag} />)}
        </div>
      )}

      <PlateVisual plateBalance={nutrition.plateBalance} />

      {mode === 'clinician' && (
        <MacroBreakdown
          macros={{ protein_g: nutrition.protein_g, carbs_g: nutrition.carbs_g, fat_g: nutrition.fat_g, fiber_g: nutrition.fiber_g }}
          calories={nutrition.calories}
        />
      )}

      {mode === 'clinician' && (
        <div>
          <div className="text-xs font-semibold text-gray-700 mb-2">Micronutrients</div>
          <MicroBreakdown micros={{ calcium_mg: nutrition.calcium_mg, iron_mg: nutrition.iron_mg, vitamin_d_mcg: nutrition.vitamin_d_mcg }} />
        </div>
      )}
    </div>
  )
}
