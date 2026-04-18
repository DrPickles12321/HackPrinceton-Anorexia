const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000

export function computeInsights({ mealLogs, foodItems, mealSlots }) {
  const cutoff = Date.now() - ONE_WEEK_MS

  const recentLogs = mealLogs.filter(log => new Date(log.logged_at).getTime() >= cutoff)
  const totalLogs = recentLogs.length

  if (totalLogs === 0) {
    return { totalLogs: 0, okay: 0, difficult: 0, refused: 0, hardestMealType: null, topRefusedCategory: null }
  }

  const okay = recentLogs.filter(l => l.status === 'okay').length
  const difficult = recentLogs.filter(l => l.status === 'difficult').length
  const refused = recentLogs.filter(l => l.status === 'refused').length

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
  for (const log of recentLogs) {
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
  for (const log of recentLogs) {
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
