import nutritionDb from '../data/nutritionDb.json'

const FALLBACKS = {
  familiar:   { calories: 200, protein_g: 6,  carbs_g: 30, fat_g: 5,  fiber_g: 2, calcium_mg: 50,  iron_mg: 1.0, vitamin_d_mcg: 0 },
  working_on: { calories: 320, protein_g: 14, carbs_g: 35, fat_g: 12, fiber_g: 3, calcium_mg: 100, iron_mg: 1.5, vitamin_d_mcg: 0.2 },
  challenge:  { calories: 450, protein_g: 12, carbs_g: 48, fat_g: 22, fiber_g: 2, calcium_mg: 80,  iron_mg: 1.5, vitamin_d_mcg: 0.1 },
}

function energyDensityLabel(calories) {
  if (calories < 200) return 'low'
  if (calories <= 400) return 'moderate'
  return 'high'
}

function plateZoneFromFallback() { return 'mixed' }

function computeAN_Flags(info) {
  const flags = []
  if (info.calcium_mg >= 200) flags.push('good calcium source')
  if (info.iron_mg >= 2) flags.push('iron rich')
  if (info.vitamin_d_mcg >= 1) flags.push('vitamin D source')
  if (info.calories >= 400) flags.push('high energy density')
  if (info.protein_g >= 15) flags.push('complete protein')
  if (info.fat_g >= 10) flags.push('contains healthy fats')
  if (info.fiber_g >= 5) flags.push('high fiber')
  return flags
}

function buildResult(raw, inputName, confidence) {
  const flags = computeAN_Flags(raw)
  return {
    name: inputName,
    matchedName: raw.name,
    confidence,
    calories: raw.calories,
    serving_description: raw.serving_description || '1 serving',
    macros: {
      protein_g: raw.protein_g,
      carbs_g: raw.carbs_g,
      fat_g: raw.fat_g,
      fiber_g: raw.fiber_g,
    },
    micros: {
      calcium_mg: raw.calcium_mg,
      iron_mg: raw.iron_mg,
      vitamin_d_mcg: raw.vitamin_d_mcg,
    },
    energy_density: energyDensityLabel(raw.calories),
    plate_zone: raw.plate_zone || 'mixed',
    an_relevant_flags: flags,
  }
}

export function lookupNutrition(foodName, category = 'working_on') {
  if (!foodName || !foodName.trim()) {
    const fb = FALLBACKS[category] || FALLBACKS.working_on
    return buildResult({ ...fb, name: foodName || '', serving_description: '1 serving', plate_zone: 'mixed' }, foodName || '', 'not_found')
  }

  const lower = foodName.toLowerCase().trim()

  // 1. Exact match
  const exact = nutritionDb.find(f => f.name.toLowerCase() === lower)
  if (exact) return buildResult(exact, foodName, 'exact')

  // 2. Fuzzy word match
  const inputWords = lower.split(/\s+/).filter(w => w.length > 2)
  let bestScore = 0
  let bestMatch = null
  for (const entry of nutritionDb) {
    const entryLower = entry.name.toLowerCase()
    const matchCount = inputWords.filter(w => entryLower.includes(w)).length
    const score = inputWords.length > 0 ? matchCount / inputWords.length : 0
    if (score > bestScore) { bestScore = score; bestMatch = entry }
  }
  if (bestMatch && bestScore >= 0.5) return buildResult(bestMatch, foodName, 'fuzzy')

  // 3. Single word fallback
  const firstWord = inputWords[0]
  if (firstWord) {
    const partial = nutritionDb.find(f => f.name.toLowerCase().includes(firstWord))
    if (partial) return buildResult(partial, foodName, 'fuzzy')
  }

  // 4. Estimated fallback
  const fb = FALLBACKS[category] || FALLBACKS.working_on
  return buildResult({ ...fb, name: foodName, serving_description: '1 serving (estimated)', plate_zone: 'mixed' }, foodName, 'not_found')
}

export function lookupMealNutrition(foods) {
  return foods.map(name => lookupNutrition(name))
}

export function aggregateMealNutrition(nutritionInfos) {
  if (!nutritionInfos.length) return {
    totalCalories: 0, totalProtein_g: 0, totalCarbs_g: 0, totalFat_g: 0,
    totalFiber_g: 0, totalCalcium_mg: 0, totalIron_mg: 0, totalVitaminD_mcg: 0,
    plateBalance: { grain_pct: 0, protein_pct: 0, produce_pct: 0, fat_pct: 0, dairy_pct: 0 },
    an_flags: [],
  }

  const totals = nutritionInfos.reduce((acc, n) => ({
    totalCalories:    acc.totalCalories    + n.calories,
    totalProtein_g:   acc.totalProtein_g   + n.macros.protein_g,
    totalCarbs_g:     acc.totalCarbs_g     + n.macros.carbs_g,
    totalFat_g:       acc.totalFat_g       + n.macros.fat_g,
    totalFiber_g:     acc.totalFiber_g     + n.macros.fiber_g,
    totalCalcium_mg:  acc.totalCalcium_mg  + n.micros.calcium_mg,
    totalIron_mg:     acc.totalIron_mg     + n.micros.iron_mg,
    totalVitaminD_mcg:acc.totalVitaminD_mcg+ n.micros.vitamin_d_mcg,
  }), { totalCalories:0, totalProtein_g:0, totalCarbs_g:0, totalFat_g:0,
        totalFiber_g:0, totalCalcium_mg:0, totalIron_mg:0, totalVitaminD_mcg:0 })

  // Plate zone percentages
  const zoneCounts = { grain: 0, protein: 0, produce: 0, fat: 0, dairy: 0, mixed: 0 }
  for (const n of nutritionInfos) {
    const z = n.plate_zone || 'mixed'
    if (z in zoneCounts) zoneCounts[z]++
    else zoneCounts.mixed++
  }
  const total = nutritionInfos.length
  const pct = z => Math.round((zoneCounts[z] / total) * 100)

  const allFlags = [...new Set(nutritionInfos.flatMap(n => n.an_relevant_flags))]

  return {
    ...totals,
    totalCalories: Math.round(totals.totalCalories),
    totalProtein_g: Math.round(totals.totalProtein_g),
    totalCarbs_g: Math.round(totals.totalCarbs_g),
    totalFat_g: Math.round(totals.totalFat_g),
    totalFiber_g: Math.round(totals.totalFiber_g),
    totalCalcium_mg: Math.round(totals.totalCalcium_mg),
    totalIron_mg: Math.round(totals.totalIron_mg * 10) / 10,
    totalVitaminD_mcg: Math.round(totals.totalVitaminD_mcg * 10) / 10,
    plateBalance: { grain_pct: pct('grain'), protein_pct: pct('protein'), produce_pct: pct('produce'), fat_pct: pct('fat'), dairy_pct: pct('dairy') },
    an_flags: allFlags,
  }
}

export { computeAN_Flags, energyDensityLabel }
