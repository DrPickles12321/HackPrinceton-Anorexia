export default function MacroBreakdown({ macros, calories }) {
  const safe = calories > 0 ? calories : 1
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-sm font-semibold">Macronutrients</span>
        <span className="text-xs text-gray-500">{calories} kcal</span>
      </div>
      <div className="h-4 rounded-full overflow-hidden flex mb-2 bg-gray-100">
        <div style={{ width: `${Math.min(100, macros.protein_g * 4 / safe * 100)}%` }} className="bg-red-400 h-full" title={`Protein: ${macros.protein_g}g`} />
        <div style={{ width: `${Math.min(100, macros.carbs_g * 4 / safe * 100)}%` }} className="bg-amber-400 h-full" title={`Carbs: ${macros.carbs_g}g`} />
        <div style={{ width: `${Math.min(100, macros.fat_g * 9 / safe * 100)}%` }} className="bg-yellow-300 h-full" title={`Fat: ${macros.fat_g}g`} />
      </div>
      <div className="grid grid-cols-4 gap-1 text-center">
        {[
          { label: 'Protein', value: macros.protein_g, color: 'text-red-600' },
          { label: 'Carbs',   value: macros.carbs_g,   color: 'text-amber-600' },
          { label: 'Fat',     value: macros.fat_g,     color: 'text-yellow-600' },
          { label: 'Fiber',   value: macros.fiber_g,   color: 'text-gray-600' },
        ].map(({ label, value, color }) => (
          <div key={label}>
            <div className={`text-sm font-semibold ${color}`}>{value}g</div>
            <div className="text-xs text-gray-500">{label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
