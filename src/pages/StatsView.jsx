import { useMemo } from 'react'
import { useOutletContext } from 'react-router-dom'

const MEAL_LABELS = { breakfast: 'Breakfast', lunch: 'Lunch', snack: 'Snack', dinner: 'Dinner' }

function getThisWeekIsoDates() {
  const today = new Date()
  const dow = today.getDay()
  const monday = new Date(today)
  monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1))
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d.toISOString().slice(0, 10)
  })
}


export default function StatsView() {
  const { mealSlots, foodItems, mealLogs, mealStatuses = {} } = useOutletContext()

  const thisWeekStatuses = useMemo(() => {
    const weekDates = getThisWeekIsoDates()
    return weekDates.flatMap(date =>
      Object.entries(mealStatuses[date] || {}).map(([mealType, status]) => ({ date, mealType, status }))
    )
  }, [mealStatuses])

  const stats = useMemo(() => {
    const total     = thisWeekStatuses.length
    const okay      = thisWeekStatuses.filter(s => s.status === 'okay').length
    const difficult = thisWeekStatuses.filter(s => s.status === 'difficult').length
    const refused   = thisWeekStatuses.filter(s => s.status === 'refused').length

    const allItems = (() => {
      try { return JSON.parse(localStorage.getItem('parentMealItemsByDate') || '{}') }
      catch { return {} }
    })()
    const weekDates = getThisWeekIsoDates()
    const challengeAttempts = thisWeekStatuses.filter(({ date, mealType }) => {
      const items = (allItems[date] || {})[mealType] || []
      return items.some(f => f.category === 'challenge')
    }).length
    const challengeMeals = weekDates.flatMap(date =>
      Object.entries(allItems[date] || {}).filter(([, items]) =>
        items.some(f => f.category === 'challenge')
      )
    ).length
    const ringPct = challengeMeals > 0 ? Math.round((challengeAttempts / challengeMeals) * 100) : 0

    const hardByMeal = { breakfast: 0, lunch: 0, snack: 0, dinner: 0 }
    const totalByMeal = { breakfast: 0, lunch: 0, snack: 0, dinner: 0 }
    for (const { mealType, status } of thisWeekStatuses) {
      totalByMeal[mealType] = (totalByMeal[mealType] || 0) + 1
      if (status === 'difficult' || status === 'refused') {
        hardByMeal[mealType] = (hardByMeal[mealType] || 0) + 1
      }
    }
    let hardestMeal = 'Dinner', hardestPct = 0
    for (const [mt, count] of Object.entries(hardByMeal)) {
      const t = totalByMeal[mt] || 0
      const pct = t > 0 ? Math.round((count / t) * 100) : 0
      if (pct > hardestPct) { hardestPct = pct; hardestMeal = mt }
    }

    const successRate = total > 0 ? Math.round((okay / total) * 100) : 0
    return { total, okay, difficult, refused, ringPct, challengeAttempts, challengeSlots: challengeMeals, hardestMeal, hardestPct, successRate }
  }, [thisWeekStatuses])

  const circumference = 2 * Math.PI * 38

  const messages = [
    stats.okay > stats.difficult
      ? `You're doing great — ${stats.okay} meals went well this week! 🌱`
      : `Every meal is progress. Keep going — you've got this! 💪`,
    stats.difficult > 0
      ? `${stats.difficult} hard moments this week. That takes courage.`
      : null,
    stats.ringPct >= 50 ? `Wow — ${stats.ringPct}% of challenge foods attempted!` : null,
  ].filter(Boolean)

  return (
    <div style={{ flex: 1, padding: '28px 32px', overflowY: 'auto' }}>
      <div style={{ maxWidth: 920, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 30 }}>
          <h2 className="font-lora" style={{ fontSize: 26, fontWeight: 400, color: 'var(--text-dark)', marginBottom: 5, lineHeight: 1.15 }}>
            Weekly Insights
          </h2>
          <p style={{ fontSize: 14, color: 'var(--text-mid)' }}>A gentle look at this week's progress</p>
        </div>

        {/* 3 main cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 22 }}>

          {/* Card 1: Challenge ring */}
          <div style={{
            background: 'white', borderRadius: 22, border: '1.5px solid var(--border)',
            padding: '28px 22px', boxShadow: '0 3px 14px rgba(39,23,6,0.06)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
          }}>
            <div style={{
              fontSize: 10, fontWeight: 700, color: 'var(--text-light)',
              letterSpacing: '0.7px', textTransform: 'uppercase',
            }}>Challenge Attempts</div>

            <div style={{ position: 'relative' }}>
              <svg width={96} height={96} style={{ transform: 'rotate(-90deg)' }}>
                <circle cx={48} cy={48} r={38} fill="none" stroke="var(--border)" strokeWidth={9} />
                <circle
                  cx={48} cy={48} r={38} fill="none"
                  stroke="var(--coral)" strokeWidth={9}
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference * (1 - stats.ringPct / 100)}
                  strokeLinecap="round"
                />
              </svg>
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--coral)', lineHeight: 1 }}>
                  {stats.ringPct}%
                </span>
              </div>
            </div>

            <div style={{
              background: 'var(--coral-light)', borderRadius: 10,
              padding: '6px 16px', fontSize: 12, color: 'var(--coral)', fontWeight: 600,
              border: '1px solid var(--coral-mid)',
            }}>
              Attempted: {stats.challengeAttempts}
            </div>
          </div>

          {/* Card 2: Supportive message */}
          <div style={{
            background: 'linear-gradient(148deg, var(--peach-light) 0%, var(--pink-light) 100%)',
            borderRadius: 22, border: '1.5px solid var(--border)',
            padding: '28px 22px', boxShadow: '0 3px 14px rgba(39,23,6,0.06)',
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 16,
          }}>
            <div style={{
              fontSize: 10, fontWeight: 700, color: 'var(--text-mid)',
              letterSpacing: '0.7px', textTransform: 'uppercase',
            }}>Supportive Message</div>

            <p className="font-lora" style={{
              fontSize: 17, color: 'var(--text-dark)', fontWeight: 400,
              lineHeight: 1.6, margin: 0, fontStyle: 'italic',
            }}>
              "{messages[0]}"
            </p>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span style={{
                background: 'white', borderRadius: 9, padding: '4px 11px',
                fontSize: 12, color: 'var(--mint)', fontWeight: 600,
                border: '1px solid var(--mint-mid)',
              }}>✓ {stats.okay} okay</span>
              {stats.difficult > 0 && (
                <span style={{
                  background: 'white', borderRadius: 9, padding: '4px 11px',
                  fontSize: 12, color: 'var(--peach)', fontWeight: 600,
                  border: '1px solid var(--peach-mid)',
                }}>{stats.difficult} hard</span>
              )}
            </div>
          </div>

          {/* Card 3: Hardest meal */}
          <div style={{
            background: 'white', borderRadius: 22, border: '1.5px solid var(--border)',
            padding: '28px 22px', boxShadow: '0 3px 14px rgba(39,23,6,0.06)',
            display: 'flex', flexDirection: 'column', gap: 16,
          }}>
            <div style={{
              fontSize: 10, fontWeight: 700, color: 'var(--text-light)',
              letterSpacing: '0.7px', textTransform: 'uppercase',
            }}>Most Logged Difficulty</div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
              <div style={{
                width: 52, height: 52, borderRadius: 16,
                background: 'var(--pink-light)', display: 'flex',
                alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0,
              }}>😰</div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-dark)', lineHeight: 1.2 }}>
                  {MEAL_LABELS[stats.hardestMeal] || 'Dinner'}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-mid)', marginTop: 2 }}>
                  {stats.hardestPct}% difficult
                </div>
              </div>
            </div>

            <div style={{ height: 7, borderRadius: 4, background: 'var(--border)', overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 4,
                background: 'linear-gradient(90deg, var(--pink) 0%, var(--coral) 100%)',
                width: `${stats.hardestPct}%`, transition: 'width 0.7s ease',
              }} />
            </div>

            <div style={{
              background: 'var(--pink-light)', borderRadius: 10,
              padding: '6px 16px', fontSize: 12, color: 'var(--pink)', fontWeight: 600,
              border: '1px solid var(--pink-mid)',
            }}>
              {MEAL_LABELS[stats.hardestMeal]}: {stats.hardestPct}% difficult
            </div>
          </div>
        </div>

        {/* Summary stat pills */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
          {[
            { label: 'Okay Meals',   value: `${stats.successRate}%`, color: '#E8735A',          bg: '#FDF1EE',            border: '#F5C4B4',          shadow: 'rgba(232,115,90,0.10)' },
            { label: 'Total Logged', value: stats.total,              color: 'var(--text-dark)', bg: 'white',              border: 'var(--border)',    shadow: 'rgba(39,23,6,0.05)' },
            { label: 'Okay',         value: stats.okay,               color: 'var(--mint)',      bg: 'var(--mint-light)',  border: 'var(--mint-mid)',  shadow: 'rgba(72,122,103,0.08)' },
            { label: 'Difficult',    value: stats.difficult,          color: 'var(--peach)',     bg: 'var(--peach-light)', border: 'var(--peach-mid)', shadow: 'rgba(176,120,40,0.08)' },
            { label: 'Refused',      value: stats.refused,            color: 'var(--pink)',      bg: 'var(--pink-light)',  border: 'var(--pink-mid)',  shadow: 'rgba(174,76,106,0.08)' },
          ].map(s => (
            <div key={s.label} style={{
              background: s.bg, borderRadius: 18, padding: '20px',
              border: `1.5px solid ${s.border}`, textAlign: 'center',
              boxShadow: `0 2px 8px ${s.shadow}`,
            }}>
              <div className="font-lora" style={{ fontSize: 38, fontWeight: 400, color: s.color, lineHeight: 1, marginBottom: 7 }}>
                {s.value}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-mid)', fontWeight: 500 }}>{s.label}</div>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
