import { useState } from 'react'
import { lookupNutrition } from '../lib/nutritionService'
import { FLAG_CONFIG } from './nutrition/FlagChip'

const ENERGY_COLOR = { low: 'bg-blue-100 text-blue-700', moderate: 'bg-green-100 text-green-700', high: 'bg-orange-100 text-orange-700' }
const ENERGY_LABEL = { low: 'Light', moderate: 'Balanced', high: 'Energy-rich' }

export default function NutritionBadge({ foodName, category, mode = 'parent' }) {
  const [open, setOpen] = useState(false)

  if (!foodName) return null

  const info = lookupNutrition(foodName, category)
  const flags = info.an_relevant_flags
  const level = info.energy_density

  if (mode === 'parent') {
    return (
      <div className="flex flex-wrap gap-1 mt-1">
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${ENERGY_COLOR[level]}`}>
          {info.calories} kcal · {ENERGY_LABEL[level]}
        </span>
        {flags.slice(0, 2).map(flag => {
          const cfg = FLAG_CONFIG[flag]
          if (!cfg) return null
          return (
            <span key={flag} className="text-[10px]" title={cfg.label} aria-label={cfg.label}>
              {cfg.icon}
            </span>
          )
        })}
      </div>
    )
  }

  // Clinician mode: hover popover
  return (
    <div className="relative mt-1" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <div className="flex flex-wrap gap-1">
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium cursor-default ${ENERGY_COLOR[level]}`}>
          {info.calories} kcal
        </span>
        {flags.slice(0, 2).map(flag => {
          const cfg = FLAG_CONFIG[flag]
          if (!cfg) return null
          return (
            <span key={flag} className="text-[10px]" title={cfg.label}>{cfg.icon}</span>
          )
        })}
      </div>

      {open && (
        <div className="absolute bottom-full left-0 mb-1 z-50 w-52 bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs">
          <div className="font-semibold text-gray-800 mb-2 truncate">{info.matchedName || info.name}</div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 mb-2">
            <span className="text-gray-500">Calories</span><span className="font-medium">{info.calories} kcal</span>
            <span className="text-gray-500">Protein</span><span className="font-medium">{info.protein_g}g</span>
            <span className="text-gray-500">Carbs</span><span className="font-medium">{info.carbs_g}g</span>
            <span className="text-gray-500">Fat</span><span className="font-medium">{info.fat_g}g</span>
            <span className="text-gray-500">Fiber</span><span className="font-medium">{info.fiber_g}g</span>
          </div>
          {flags.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-2 border-t border-gray-100">
              {flags.map(flag => {
                const cfg = FLAG_CONFIG[flag]
                return cfg ? (
                  <span key={flag} className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${cfg.color}`}>
                    {cfg.icon} {cfg.label}
                  </span>
                ) : null
              })}
            </div>
          )}
          <div className="text-[10px] text-gray-400 mt-2 italic">Estimated · {info.serving_description}</div>
        </div>
      )}
    </div>
  )
}
