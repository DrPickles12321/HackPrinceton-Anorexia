import { lookupNutrition } from './nutritionService'

async function callClaude(prompt) {
  const key = import.meta.env.VITE_ANTHROPIC_API_KEY
  if (!key) throw new Error('VITE_ANTHROPIC_API_KEY is not set in .env — restart the dev server after adding it')
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true', // required for direct browser calls; use a backend proxy in production
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Anthropic API ${res.status}: ${errText}`)
  }
  const data = await res.json()
  return data.content[0]?.text?.trim() || ''
}

function extractJSON(text) {
  const match = text.match(/\[[\s\S]*\]/)
  if (!match) throw new Error('No JSON array found in response')
  return JSON.parse(match[0])
}

export async function generateWeeklyInsights({ parentMealItemsByDate, mealLogs = {} }) {
  const dates = Object.keys(parentMealItemsByDate).sort()
  const daysWithFood = dates.filter(d =>
    Object.values(parentMealItemsByDate[d]).flat().length > 0
  )
  if (daysWithFood.length === 0) return null

  const daySummaries = daysWithFood.map(date => {
    const day = parentMealItemsByDate[date]
    const meals = Object.entries(day)
      .filter(([, items]) => items.length > 0)
      .map(([meal, items]) => {
        const names = items.map(f => f.name).join(', ')
        const cals = items.reduce((s, f) => s + (lookupNutrition(f.name, f.category).calories || 0), 0)
        return `  ${meal}: ${names} (~${Math.round(cals)} kcal)`
      }).join('\n')
    return `${date}:\n${meals}`
  }).join('\n\n')

  const okay = typeof mealLogs.okay === 'number' ? mealLogs.okay : (mealLogs.filter ? mealLogs.filter(l => l.status === 'okay').length : 0)
  const difficult = typeof mealLogs.difficult === 'number' ? mealLogs.difficult : (mealLogs.filter ? mealLogs.filter(l => l.status === 'difficult').length : 0)
  const refused = typeof mealLogs.refused === 'number' ? mealLogs.refused : (mealLogs.filter ? mealLogs.filter(l => l.status === 'refused').length : 0)

  const prompt = `You are an uplifting, warm support coach for a family working on healthy eating habits together. Look at this week's meals and give 3 short, specific, encouraging observations.

Week (${daysWithFood.length} days planned):
${daySummaries}

This week: ${okay} meals felt okay, ${difficult} felt difficult, ${refused} were skipped.

Rules:
- No medical advice, diagnoses, or clinical language whatsoever
- Each insight is ONE sentence max — keep it brief and warm
- Be specific (mention actual foods or days), not generic
- Focus on effort, variety, and positive patterns
- If something is missing, frame it as encouragement, not criticism
- Return ONLY a JSON array: [{ "type": "positive"|"tip"|"notice", "icon": "<emoji>", "text": "<one sentence>" }]
- Exactly 3 items`

  const raw = await callClaude(prompt)
  const parsed = extractJSON(raw)
  return Array.isArray(parsed) ? parsed : null
}
