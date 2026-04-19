const DEMO_FAMILY_ID = process.env.FAMILY_ID || '11111111-1111-1111-1111-111111111111'

const DAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
const DAY_LABELS = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' }

/**
 * Builds a prompt-ready summary of this week's meal slots, foods, and logs.
 */
export async function buildWeekSummary(supabase) {
  const [slotsRes, foodsRes, logsRes] = await Promise.all([
    supabase.from('meal_slots').select('*').eq('family_id', DEMO_FAMILY_ID),
    supabase.from('food_items').select('*').eq('family_id', DEMO_FAMILY_ID),
    supabase.from('meal_logs').select('*, meal_slots!inner(family_id)').eq('meal_slots.family_id', DEMO_FAMILY_ID).order('logged_at', { ascending: false }),
  ])

  if (slotsRes.error) throw slotsRes.error
  if (foodsRes.error) throw foodsRes.error
  if (logsRes.error) throw logsRes.error

  const slots = slotsRes.data || []
  const foods = foodsRes.data || []
  const logs = logsRes.data || []

  if (slots.length === 0) return 'No meal plan set up yet.'

  const foodById = Object.fromEntries(foods.map(f => [f.id, f]))

  // Latest log per slot
  const latestLogBySlot = {}
  for (const log of logs) {
    if (!latestLogBySlot[log.meal_slot_id]) latestLogBySlot[log.meal_slot_id] = log
  }

  // Group slots by day
  const byDay = {}
  for (const slot of slots) {
    if (!byDay[slot.day]) byDay[slot.day] = []
    byDay[slot.day].push(slot)
  }

  const lines = []
  for (const day of DAY_ORDER) {
    const daySlots = byDay[day]
    if (!daySlots) continue
    const mealLines = daySlots.map(slot => {
      const food = slot.assigned_food_id ? foodById[slot.assigned_food_id] : null
      const foodName = food ? `${food.name} (${food.category.replace('_', ' ')})` : 'no food assigned'
      const log = latestLogBySlot[slot.id]
      const status = log ? log.status : 'not logged'
      const note = log?.note ? ` — "${log.note}"` : ''
      return `  ${slot.meal_type}: ${foodName} → ${status}${note}`
    })
    lines.push(`${DAY_LABELS[day]}:\n${mealLines.join('\n')}`)
  }

  const totalLogged = Object.keys(latestLogBySlot).length
  const okay = logs.filter(l => l.status === 'okay').length
  const difficult = logs.filter(l => l.status === 'difficult').length
  const refused = logs.filter(l => l.status === 'refused').length

  const summary = `Weekly meal summary (${totalLogged} meals logged — ${okay} okay, ${difficult} difficult, ${refused} refused):\n\n${lines.join('\n\n')}`
  return summary
}

/**
 * Calculates streaks and recent challenge food wins.
 */
export async function getStreaks(supabase) {
  const [slotsRes, foodsRes, logsRes] = await Promise.all([
    supabase.from('meal_slots').select('id').eq('family_id', DEMO_FAMILY_ID),
    supabase.from('food_items').select('id, name, category').eq('family_id', DEMO_FAMILY_ID),
    supabase.from('meal_logs').select('meal_slot_id, status, logged_at')
      .order('logged_at', { ascending: false }).limit(50),
  ])

  const logs = logsRes.data || []
  const foods = Object.fromEntries((foodsRes.data || []).map(f => [f.id, f]))
  const slots = Object.fromEntries((slotsRes.data || []).map(s => [s.id, s]))

  // Longest consecutive okay streak
  let currentStreak = 0, longestOkayStreak = 0
  for (const log of [...logs].reverse()) {
    if (log.status === 'okay') { currentStreak++; longestOkayStreak = Math.max(longestOkayStreak, currentStreak) }
    else currentStreak = 0
  }

  // Most recent challenge food marked okay
  let recentChallengeOkay = null
  for (const log of logs) {
    if (log.status === 'okay') {
      const slot = slots[log.meal_slot_id]
      if (slot?.assigned_food_id) {
        const food = foods[slot.assigned_food_id]
        if (food?.category === 'challenge') { recentChallengeOkay = food.name; break }
      }
    }
  }

  return { longestOkayStreak, recentChallengeOkay }
}

/**
 * Gets today's dinner slot and its latest log (if any).
 * Uses day-of-week since meal_slots use mon/tue/etc, not dates.
 */
export async function getTodayDinner(supabase) {
  const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
  const todayDay = days[new Date().getDay()]

  const { data: slot, error: slotErr } = await supabase
    .from('meal_slots')
    .select('*')
    .eq('family_id', DEMO_FAMILY_ID)
    .eq('day', todayDay)
    .eq('meal_type', 'dinner')
    .maybeSingle()

  if (slotErr) throw slotErr
  if (!slot) return null

  const { data: log, error: logErr } = await supabase
    .from('meal_logs')
    .select('*')
    .eq('meal_slot_id', slot.id)
    .order('logged_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (logErr) throw logErr
  return log ? { ...slot, status: log.status, note: log.note } : { ...slot, status: null }
}
