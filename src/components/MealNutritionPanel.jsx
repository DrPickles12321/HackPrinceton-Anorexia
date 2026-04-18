import { useMemo } from 'react'
import { lookupMealNutrition, aggregateMealNutrition, computeAN_Flags, energyDensityLabel } from '../lib/nutritionService'
import MacroBreakdown from './nutrition/MacroBreakdown'
import MicroBreakdown from './nutrition/MicroBreakdown'
import PlateVisual from './nutrition/PlateVisual'
import EnergyDensityBar from './nutrition/EnergyDensityBar'
import FlagChip from './nutrition/FlagChip'

export default function MealNutritionPanel({ foods, mode = 'parent' }) {
  const nutrition = useMemo(() => {
    if (!foods || foods.length === 0) return null
    const infos = lookupMealNutrition(foods)
    return aggregateMealNutrition(infos)
  }, [foods])

  const flags = useMemo(() => {
    if (!nutrition) return []
    return computeAN_Flags(nutrition)
  }, [nutrition])

  const energyLevel = useMemo(() => {
    if (!nutrition) return 'moderate'
    return energyDensityLabel(nutrition.calories)
  }, [nutrition])

  if (!nutrition) return null

  return (
    <div className="bg-gray-50 rounded-xl p-4 space-y-4 mt-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-800">Meal Nutrition</h3>
        <span className="text-xs text-gray-400 italic">Estimated values</span>
      </div>

      {/* Energy density — parent sees non-numeric bar, clinician sees both */}
      {mode === 'clinician' && (
        <div className="text-xs text-gray-600 font-medium">{nutrition.calories} kcal total</div>
      )}
      <EnergyDensityBar level={energyLevel} />

      {/* Flags */}
      {flags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {flags.map(flag => <FlagChip key={flag} flag={flag} />)}
        </div>
      )}

      {/* Plate visual */}
      <PlateVisual plateBalance={nutrition.plateBalance} />

      {/* Macros — clinician only */}
      {mode === 'clinician' && (
        <MacroBreakdown
          macros={{ protein_g: nutrition.protein_g, carbs_g: nutrition.carbs_g, fat_g: nutrition.fat_g, fiber_g: nutrition.fiber_g }}
          calories={nutrition.calories}
        />
      )}

      {/* Micros — clinician only */}
      {mode === 'clinician' && (
        <div>
          <div className="text-xs font-semibold text-gray-700 mb-2">Micronutrients</div>
          <MicroBreakdown micros={{ calcium_mg: nutrition.calcium_mg, iron_mg: nutrition.iron_mg, vitamin_d_mcg: nutrition.vitamin_d_mcg }} />
        </div>
      )}
    </div>
  )
}
