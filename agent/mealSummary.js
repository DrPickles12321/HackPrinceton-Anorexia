/**
 * Fetches the last 7 days of meal_events and returns a prompt-ready summary string.
 */
export async function buildWeekSummary(supabase) {
  const since = new Date()
  since.setDate(since.getDate() - 7)
  const { data, error } = await supabase
    .from('meal_events')
    .select('*')
    .gte('date', since.toISOString().split('T')[0])
    .order('date', { ascending: true })
    .order('meal_type', { ascending: true })

  if (error) throw error
  if (!data || data.length === 0) return 'No meals logged in the past 7 days.'

  const byDate = {}
  for (const row of data) {
    if (!byDate[row.date]) byDate[row.date] = []
    byDate[row.date].push(row)
  }

  return Object.entries(byDate).map(([date, rows]) => {
    const meals = rows.map(r => {
      const foods = Array.isArray(r.food_items) && r.food_items.length > 0
        ? ` (${r.food_items.map(f => f.name).join(', ')})`
        : ''
      return `  ${r.meal_type}: ${r.status}${foods}`
    }).join('\n')
    return `${date}:\n${meals}`
  }).join('\n\n')
}

/**
 * Fetches just today's dinner event (if any).
 */
export async function getTodayDinner(supabase) {
  const today = new Date().toISOString().split('T')[0]
  const { data, error } = await supabase
    .from('meal_events')
    .select('*')
    .eq('date', today)
    .eq('meal_type', 'dinner')
    .maybeSingle()

  if (error) throw error
  return data
}
