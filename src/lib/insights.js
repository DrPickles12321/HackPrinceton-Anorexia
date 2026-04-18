import { lookupNutrition, aggregateMealNutrition } from './nutritionService'

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000

// Recommended daily intakes for anorexia recovery (conservative estimates)
const RECOMMENDED_DAILY = {
  calcium_mg: 1000,    // mg/day
  iron_mg: 18,         // mg/day (for women)
  vitamin_d_mcg: 15,   // mcg/day
}

// Convert to weekly totals
const RECOMMENDED_WEEKLY = {
  calcium_mg: RECOMMENDED_DAILY.calcium_mg * 7,
  iron_mg: RECOMMENDED_DAILY.iron_mg * 7,
  vitamin_d_mcg: RECOMMENDED_DAILY.vitamin_d_mcg * 7,
}

export function computeSupplementRecommendations({ mealSlots, foodItems }) {
  const filledSlots = mealSlots.filter(s => s.assigned_food_id)
  if (filledSlots.length === 0) return []

  const nutritionInfos = filledSlots.map(slot => {
    const food = foodItems.find(f => f.id === slot.assigned_food_id)
    if (!food) return null
    return lookupNutrition(food.name, food.category)
  }).filter(Boolean)

  const weeklyTotals = aggregateMealNutrition(nutritionInfos)

  const recommendations = []

  // Check each nutrient
  if (weeklyTotals.calcium_mg < RECOMMENDED_WEEKLY.calcium_mg * 0.7) { // Less than 70% of recommended
    recommendations.push({
      nutrient: 'Calcium',
      current: weeklyTotals.calcium_mg,
      recommended: RECOMMENDED_WEEKLY.calcium_mg,
      supplement: 'Calcium citrate or carbonate (500-1000mg/day)',
      reason: 'Supports bone health and muscle function',
    })
  }

  if (weeklyTotals.iron_mg < RECOMMENDED_WEEKLY.iron_mg * 0.7) {
    recommendations.push({
      nutrient: 'Iron',
      current: weeklyTotals.iron_mg,
      recommended: RECOMMENDED_WEEKLY.iron_mg,
      supplement: 'Iron bisglycinate or ferrous sulfate (18-65mg/day)',
      reason: 'Prevents anemia and supports energy levels',
    })
  }

  if (weeklyTotals.vitamin_d_mcg < RECOMMENDED_WEEKLY.vitamin_d_mcg * 0.7) {
    recommendations.push({
      nutrient: 'Vitamin D',
      current: weeklyTotals.vitamin_d_mcg,
      recommended: RECOMMENDED_WEEKLY.vitamin_d_mcg,
      supplement: 'Vitamin D3 (1000-2000 IU/day)',
      reason: 'Essential for calcium absorption and immune function',
    })
  }

  // Always recommend a multivitamin as baseline
  recommendations.push({
    nutrient: 'Multivitamin',
    current: null,
    recommended: null,
    supplement: 'Complete multivitamin with minerals',
    reason: 'Provides comprehensive micronutrient support',
  })

  // Additional common recommendations for AN recovery
  recommendations.push({
    nutrient: 'Omega-3 Fatty Acids',
    current: null,
    recommended: null,
    supplement: 'Fish oil or algae-based EPA/DHA (1000-2000mg/day)',
    reason: 'Supports brain health and reduces inflammation',
  })

  recommendations.push({
    nutrient: 'Probiotics',
    current: null,
    recommended: null,
    supplement: 'Broad-spectrum probiotic (daily)',
    reason: 'Supports gut health and digestion',
  })

  return recommendations
}

export function computeNutritionInsights({ mealSlots, foodItems }) {
  const filledSlots = mealSlots.filter(s => s.assigned_food_id)
  if (filledSlots.length === 0) return { avgDailyCalories: null, topRecoveryNutrient: null }

  const calsByDay = {}
  const flagCounts = {}

  for (const slot of filledSlots) {
    const food = foodItems.find(f => f.id === slot.assigned_food_id)
    if (!food) continue
    const info = lookupNutrition(food.name, food.category)
    calsByDay[slot.day] = (calsByDay[slot.day] || 0) + info.calories
    for (const flag of (info.an_relevant_flags || [])) {
      flagCounts[flag] = (flagCounts[flag] || 0) + 1
    }
  }

  const days = Object.values(calsByDay)
  const avgDailyCalories = days.length > 0 ? Math.round(days.reduce((a, b) => a + b, 0) / days.length) : null

  let topRecoveryNutrient = null
  let maxCount = 0
  for (const [flag, count] of Object.entries(flagCounts)) {
    if (count > maxCount) {
      maxCount = count
      topRecoveryNutrient = { flag, count }
    }
  }

  return { avgDailyCalories, topRecoveryNutrient }
}

export function computeInsightsFromMealItems(allMealItems) {
  const cutoff = Date.now() - ONE_WEEK_MS
  const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack']

  const recentDates = Object.keys(allMealItems).filter(
    dateStr => new Date(dateStr).getTime() >= cutoff
  )

  if (recentDates.length === 0) {
    return { totalLogs: 0, okay: 0, difficult: 0, refused: 0, hardestMealType: null, topRefusedCategory: null }
  }

  let totalLogs = 0
  const countByMealType = { breakfast: 0, lunch: 0, dinner: 0, snack: 0 }
  const categoryCount = { familiar: 0, working_on: 0, challenge: 0 }

  for (const date of recentDates) {
    const dayMeals = allMealItems[date] || {}
    for (const mealType of MEAL_TYPES) {
      const items = dayMeals[mealType] || []
      if (items.length > 0) {
        totalLogs++
        countByMealType[mealType]++
        for (const item of items) {
          const cat = item.category || 'working_on'
          if (cat in categoryCount) categoryCount[cat]++
        }
      }
    }
  }

  if (totalLogs === 0) {
    return { totalLogs: 0, okay: 0, difficult: 0, refused: 0, hardestMealType: null, topRefusedCategory: null }
  }

  const okay = totalLogs
  const difficult = 0
  const refused = 0

  let hardestMealType = null
  let maxCount = 0
  for (const [mealType, count] of Object.entries(countByMealType)) {
    if (count > maxCount) { maxCount = count; hardestMealType = { mealType, count } }
  }

  let topRefusedCategory = null
  let maxCat = 0
  for (const [category, count] of Object.entries(categoryCount)) {
    if (count > maxCat) { maxCat = count; topRefusedCategory = { category, count } }
  }

  return { totalLogs, okay, difficult, refused, hardestMealType, topRefusedCategory }
}

export function computeNutritionInsightsFromMealItems(allMealItems) {
  const cutoff = Date.now() - ONE_WEEK_MS
  const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack']

  const recentDates = Object.keys(allMealItems).filter(
    dateStr => new Date(dateStr).getTime() >= cutoff
  )

  if (recentDates.length === 0) return { avgDailyCalories: null, topRecoveryNutrient: null }

  const calsByDate = {}
  const flagCounts = {}

  for (const date of recentDates) {
    const dayMeals = allMealItems[date] || {}
    for (const mealType of MEAL_TYPES) {
      const items = dayMeals[mealType] || []
      for (const item of items) {
        const info = lookupNutrition(item.name, item.category || 'working_on')
        calsByDate[date] = (calsByDate[date] || 0) + info.calories
        for (const flag of (info.an_relevant_flags || [])) {
          flagCounts[flag] = (flagCounts[flag] || 0) + 1
        }
      }
    }
  }

  const days = Object.values(calsByDate)
  const avgDailyCalories = days.length > 0
    ? Math.round(days.reduce((a, b) => a + b, 0) / days.length)
    : null

  let topRecoveryNutrient = null
  let maxCount = 0
  for (const [flag, count] of Object.entries(flagCounts)) {
    if (count > maxCount) { maxCount = count; topRecoveryNutrient = { flag, count } }
  }

  return { avgDailyCalories, topRecoveryNutrient }
}

export function computeInsights({ mealLogs, foodItems, mealSlots }) {
  const cutoff = Date.now() - ONE_WEEK_MS

  const recentLogs = mealLogs.filter(log => new Date(log.logged_at).getTime() >= cutoff)

  // Keep only the latest log per slot so re-logging doesn't inflate counts
  const latestBySlot = {}
  for (const log of recentLogs) {
    const existing = latestBySlot[log.meal_slot_id]
    if (!existing || new Date(log.logged_at) > new Date(existing.logged_at)) {
      latestBySlot[log.meal_slot_id] = log
    }
  }
  const dedupedLogs = Object.values(latestBySlot)
  const totalLogs = dedupedLogs.length

  if (totalLogs === 0) {
    return { totalLogs: 0, okay: 0, difficult: 0, refused: 0, hardestMealType: null, topRefusedCategory: null }
  }

  const okay      = dedupedLogs.filter(l => l.status === 'okay').length
  const difficult = dedupedLogs.filter(l => l.status === 'difficult').length
  const refused   = dedupedLogs.filter(l => l.status === 'refused').length

  const slotMealType = {}
  const slotFoodId = {}
  for (const slot of mealSlots) {
    slotMealType[slot.id] = slot.meal_type
    slotFoodId[slot.id] = slot.assigned_food_id
  }

  const foodCategory = {}
  for (const food of foodItems) {
    foodCategory[food.id] = food.category
  }

  const hardCountByMealType = { breakfast: 0, lunch: 0, dinner: 0, snack: 0 }
  for (const log of dedupedLogs) {
    if (log.status === 'difficult' || log.status === 'refused') {
      const mt = slotMealType[log.meal_slot_id]
      if (mt) hardCountByMealType[mt]++
    }
  }

  // Ties broken by iteration order: breakfast > lunch > dinner > snack
  let hardestMealType = null
  let maxHardCount = 0
  for (const [mealType, count] of Object.entries(hardCountByMealType)) {
    if (count > maxHardCount) {
      maxHardCount = count
      hardestMealType = { mealType, count }
    }
  }

  const refusedByCategory = { familiar: 0, working_on: 0, challenge: 0 }
  for (const log of dedupedLogs) {
    if (log.status !== 'refused') continue
    const foodId = slotFoodId[log.meal_slot_id]
    if (!foodId) continue
    const cat = foodCategory[foodId]
    if (cat) refusedByCategory[cat]++
  }

  let topRefusedCategory = null
  let maxRefusedCount = 0
  for (const [cat, count] of Object.entries(refusedByCategory)) {
    if (count > maxRefusedCount) {
      maxRefusedCount = count
      topRefusedCategory = { category: cat, count }
    }
  }

  return { totalLogs, okay, difficult, refused, hardestMealType, topRefusedCategory }
}
