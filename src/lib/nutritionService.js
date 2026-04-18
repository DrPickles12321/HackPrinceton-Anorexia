import nutritionDb from '../data/nutritionDb.json'

const FALLBACKS = {
  familiar:   { calories: 200, protein_g: 6,  carbs_g: 30, fat_g: 5,  fiber_g: 2, calcium_mg: 50,  iron_mg: 1.0, vitamin_d_mcg: 0 },
  working_on: { calories: 320, protein_g: 14, carbs_g: 35, fat_g: 12, fiber_g: 3, calcium_mg: 100, iron_mg: 1.5, vitamin_d_mcg: 0.2 },
  challenge:  { calories: 450, protein_g: 12, carbs_g: 48, fat_g: 22, fiber_g: 2, calcium_mg: 80,  iron_mg: 1.5, vitamin_d_mcg: 0.1 },
}

export function energyDensityLabel(calories) {
  if (calories < 200) return 'low'
  if (calories <= 400) return 'moderate'
  return 'high'
}

export function computeAN_Flags(info) {
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

// Returns a flat object — no nested macros/micros
function buildResult(raw, inputName, confidence) {
  const result = {
    name: inputName,
    matchedName: raw.name,
    confidence,
    serving_description: raw.serving_description || '1 serving',
    calories: raw.calories,
    protein_g: raw.protein_g,
    carbs_g: raw.carbs_g,
    fat_g: raw.fat_g,
    fiber_g: raw.fiber_g,
    calcium_mg: raw.calcium_mg,
    iron_mg: raw.iron_mg,
    vitamin_d_mcg: raw.vitamin_d_mcg,
    energy_density: energyDensityLabel(raw.calories),
    plate_zone: raw.plate_zone || 'mixed',
  }
  result.an_relevant_flags = computeAN_Flags(result)
  return result
}

export function lookupNutrition(foodName, category = 'working_on') {
  if (!foodName || (typeof foodName === 'string' && !foodName.trim())) {
    const fb = FALLBACKS[category] || FALLBACKS.working_on
    return buildResult({ ...fb, name: foodName || '', serving_description: '1 serving', plate_zone: 'mixed' }, foodName || '', 'not_found')
  }

  const lower = (typeof foodName === 'string' ? foodName : String(foodName)).toLowerCase().trim()

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

// Accepts array of strings OR {name, category} objects
export function lookupMealNutrition(foods) {
  return foods.map(f => {
    if (typeof f === 'string') return lookupNutrition(f)
    return lookupNutrition(f.name, f.category)
  })
}

// Accepts array of flat lookupNutrition results; returns flat aggregate
export function aggregateMealNutrition(nutritionInfos) {
  if (!nutritionInfos || !nutritionInfos.length) return {
    calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0,
    calcium_mg: 0, iron_mg: 0, vitamin_d_mcg: 0,
    plateBalance: { grain_pct: 0, protein_pct: 0, produce_pct: 0, fat_pct: 0, dairy_pct: 0 },
    an_relevant_flags: [],
  }

  const sums = nutritionInfos.reduce((acc, n) => ({
    calories:      acc.calories      + (n.calories || 0),
    protein_g:     acc.protein_g     + (n.protein_g || 0),
    carbs_g:       acc.carbs_g       + (n.carbs_g || 0),
    fat_g:         acc.fat_g         + (n.fat_g || 0),
    fiber_g:       acc.fiber_g       + (n.fiber_g || 0),
    calcium_mg:    acc.calcium_mg    + (n.calcium_mg || 0),
    iron_mg:       acc.iron_mg       + (n.iron_mg || 0),
    vitamin_d_mcg: acc.vitamin_d_mcg + (n.vitamin_d_mcg || 0),
  }), { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0, calcium_mg: 0, iron_mg: 0, vitamin_d_mcg: 0 })

  const rounded = {
    calories:      Math.round(sums.calories),
    protein_g:     Math.round(sums.protein_g),
    carbs_g:       Math.round(sums.carbs_g),
    fat_g:         Math.round(sums.fat_g),
    fiber_g:       Math.round(sums.fiber_g),
    calcium_mg:    Math.round(sums.calcium_mg),
    iron_mg:       Math.round(sums.iron_mg * 10) / 10,
    vitamin_d_mcg: Math.round(sums.vitamin_d_mcg * 10) / 10,
  }

  // Plate zone percentages
  const zoneCounts = { grain: 0, protein: 0, produce: 0, fat: 0, dairy: 0, mixed: 0 }
  for (const n of nutritionInfos) {
    const z = n.plate_zone || 'mixed'
    if (z in zoneCounts) zoneCounts[z]++
    else zoneCounts.mixed++
  }
  const total = nutritionInfos.length
  const pct = z => Math.round((zoneCounts[z] / total) * 100)

  const an_relevant_flags = [...new Set(nutritionInfos.flatMap(n => n.an_relevant_flags || []))]

  return {
    ...rounded,
    plateBalance: { grain_pct: pct('grain'), protein_pct: pct('protein'), produce_pct: pct('produce'), fat_pct: pct('fat'), dairy_pct: pct('dairy') },
    an_relevant_flags,
  }
}
