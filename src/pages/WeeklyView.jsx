import { useMemo, useState, useEffect, useRef, useCallback } from 'react'
import { useOutletContext } from 'react-router-dom'
import { lookupNutrition } from '../lib/nutritionService'

const DAYS = [
  { key: 'mon', label: 'Mon', full: 'Monday'    },
  { key: 'tue', label: 'Tue', full: 'Tuesday'   },
  { key: 'wed', label: 'Wed', full: 'Wednesday' },
  { key: 'thu', label: 'Thu', full: 'Thursday'  },
  { key: 'fri', label: 'Fri', full: 'Friday'    },
  { key: 'sat', label: 'Sat', full: 'Saturday'  },
  { key: 'sun', label: 'Sun', full: 'Sunday'    },
]

const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
const TODAY_ISO = new Date().toISOString().slice(0, 10)

function getWeekDates() {
  const today = new Date()
  const dow = today.getDay()
  const diff = dow === 0 ? -6 : 1 - dow
  const monday = new Date(today)
  monday.setDate(today.getDate() + diff)
  const result = {}
  DAY_KEYS.forEach((key, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    result[key] = d.toISOString().slice(0, 10)
  })
  return result
}

const WEEK_DATES = getWeekDates()

const MEALS = [
  { key: 'breakfast', label: 'B', icon: '☀️' },
  { key: 'lunch',     label: 'L', icon: '🥗' },
  { key: 'snack',     label: 'S', icon: '🍎' },
  { key: 'dinner',    label: 'D', icon: '🌙' },
]

const STATUS_STYLE = {
  okay:      { bg: '#E2EEE8', dot: '#5EA87A', label: 'Okay'      },
  difficult: { bg: '#F5EDD8', dot: '#C09040', label: 'Difficult' },
  refused:   { bg: '#F0E0E8', dot: '#B86080', label: 'Refused'   },
  empty:     { bg: '#F7F2EC', dot: null,      label: ''          },
}

const MACRO_COLORS = {
  protein:       { color: '#E8735A', label: 'Protein' },
  carbs:         { color: '#F5A623', label: 'Carbs'   },
  fruitsVeggies: { color: '#7BC67E', label: 'F&V'     },
}

const PRODUCE_G_PER_SERVING = 80
const POPOVER_WIDTH = 280

// ─── Pie chart (single source of truth for macro values) ─────────────────────

function polarToCartesian(cx, cy, r, deg) {
  const rad = ((deg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function arcPath(cx, cy, r, startDeg, endDeg) {
  if (endDeg - startDeg >= 360) endDeg = startDeg + 359.99
  const s = polarToCartesian(cx, cy, r, startDeg)
  const e = polarToCartesian(cx, cy, r, endDeg)
  return `M ${cx} ${cy} L ${s.x} ${s.y} A ${r} ${r} 0 ${endDeg - startDeg > 180 ? 1 : 0} 1 ${e.x} ${e.y} Z`
}

function MacroPie({ macros }) {
  const { protein, carbs, fruitsVeggies } = macros
  const total = protein + carbs + fruitsVeggies

  if (total === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 100, height: 100, borderRadius: '50%',
          border: '2px dashed #E0E0E0',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: 11, color: '#aaa', textAlign: 'center', padding: '0 8px' }}>No data</span>
        </div>
      </div>
    )
  }

  const segments = [
    { key: 'protein',       value: protein,       ...MACRO_COLORS.protein       },
    { key: 'carbs',         value: carbs,         ...MACRO_COLORS.carbs         },
    { key: 'fruitsVeggies', value: fruitsVeggies, ...MACRO_COLORS.fruitsVeggies },
  ].filter(s => s.value > 0)

  const cx = 50, cy = 50, r = 44, innerR = 18
  let angle = 0
  const arcs = segments.map(seg => {
    const sweep = (seg.value / total) * 360
    const path = arcPath(cx, cy, r, angle, angle + sweep)
    angle += sweep
    return { ...seg, path }
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      <svg width={100} height={100}>
        <circle cx={cx} cy={cy} r={r + 4} fill="white" stroke="#f0f0f0" strokeWidth={1} />
        {arcs.map(seg => (
          <path key={seg.key} d={seg.path} fill={seg.color} stroke="white" strokeWidth={1.5} />
        ))}
        <circle cx={cx} cy={cy} r={innerR} fill="white" />
      </svg>

      {/* Legend — same values used here as in the pie above */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, width: '100%' }}>
        {[
          { key: 'protein',       value: protein,       ...MACRO_COLORS.protein       },
          { key: 'carbs',         value: carbs,         ...MACRO_COLORS.carbs         },
          { key: 'fruitsVeggies', value: fruitsVeggies, ...MACRO_COLORS.fruitsVeggies },
        ].map(item => (
          <div key={item.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: item.color, flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: '#666' }}>{item.label}</span>
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#333' }}>{item.value}g</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Day popover ──────────────────────────────────────────────────────────────

function DayPopover({ day, macros, style, popoverRef }) {
  const hasData = macros && (macros.protein + macros.carbs + macros.fruitsVeggies) > 0

  return (
    <div
      ref={popoverRef}
      style={{
        ...style,
        background: 'white',
        borderRadius: 16,
        boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
        overflow: 'hidden',
        width: POPOVER_WIDTH,
      }}
    >
      {/* Header */}
      <div style={{
        background: '#E8735A', padding: '12px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontWeight: 700, fontSize: 15, color: 'white' }}>{day.full}</span>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', fontWeight: 500 }}>Daily summary</span>
      </div>

      {/* Body */}
      <div style={{ padding: '16px' }}>
        {!hasData ? (
          <p style={{ fontSize: 13, color: '#aaa', textAlign: 'center', padding: '16px 0' }}>
            No meals logged for this day
          </p>
        ) : (
          <MacroPie macros={macros} />
        )}
      </div>
    </div>
  )
}

// ─── Main view ────────────────────────────────────────────────────────────────

export default function WeeklyView() {
  const { mealSlots, foodItems, mealLogs } = useOutletContext()
  const [openDay, setOpenDay]         = useState(null)
  const [popoverPos, setPopoverPos]   = useState({ top: 0, left: 0 })
  const popoverRef  = useRef(null)
  const headerRefs  = useRef({})

  // ── close on outside click ──
  useEffect(() => {
    if (!openDay) return
    function onDown(e) {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) setOpenDay(null)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [openDay])

  // ── latest log per slot ──
  const latestLogBySlot = useMemo(() => {
    const map = {}
    for (const log of [...mealLogs].sort((a, b) => new Date(a.logged_at) - new Date(b.logged_at))) {
      map[log.meal_slot_id] = log
    }
    return map
  }, [mealLogs])

  // ── compute macros for a day (single calculation, passed to both pie and text) ──
  const macrosByDay = useMemo(() => {
    const result = {}
    for (const day of DAYS) {
      const daySlots = mealSlots.filter(s => s.day === day.key && s.assigned_food_id)
      let protein = 0, carbs = 0, fruitsVeggies = 0
      for (const slot of daySlots) {
        const food = foodItems.find(f => f.id === slot.assigned_food_id)
        if (!food) continue
        const info = lookupNutrition(food.name, food.category)
        protein       += info.protein_g || 0
        carbs         += info.carbs_g   || 0
        fruitsVeggies += info.plate_zone === 'produce' ? PRODUCE_G_PER_SERVING : 0
      }
      result[day.key] = {
        protein:       Math.round(protein),
        carbs:         Math.round(carbs),
        fruitsVeggies: Math.round(fruitsVeggies),
      }
    }
    return result
  }, [mealSlots, foodItems])

  // ── day header click → compute viewport-safe position ──
  const handleDayClick = useCallback((dayKey) => {
    if (openDay === dayKey) { setOpenDay(null); return }
    const el = headerRefs.current[dayKey]
    if (!el) return
    const rect = el.getBoundingClientRect()
    const idealLeft = rect.left + rect.width / 2 - POPOVER_WIDTH / 2
    const clampedLeft = Math.max(16, Math.min(idealLeft, window.innerWidth - POPOVER_WIDTH - 16))
    setPopoverPos({ top: rect.bottom + 8, left: clampedLeft })
    setOpenDay(dayKey)
  }, [openDay])

  function getSlot(day, mealType) {
    return mealSlots.find(s => s.day === day && s.meal_type === mealType) || null
  }

  const totalLogged = mealLogs.length
  const okayCount   = mealLogs.filter(l => l.status === 'okay').length
  const pct = totalLogged > 0 ? Math.round((okayCount / totalLogged) * 100) : 0

  const openDayObj = DAYS.find(d => d.key === openDay)

  return (
    <div style={{ flex: 1, padding: '28px 32px', overflowY: 'auto', margin: '0 -24px' }}>

        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <h2 className="font-lora" style={{ fontSize: 26, fontWeight: 400, color: 'var(--text-dark)', marginBottom: 5, lineHeight: 1.15 }}>
            This Week at a Glance
          </h2>
          <p style={{ fontSize: 14, color: 'var(--text-mid)' }}>Click a day header for the daily nutrition summary</p>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: 18, marginBottom: 20, flexWrap: 'wrap' }}>
          {(['okay', 'difficult', 'refused']).map(s => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <div style={{
                width: 22, height: 14, borderRadius: 5,
                background: STATUS_STYLE[s].bg,
                border: `1.5px solid ${STATUS_STYLE[s].dot}40`,
              }} />
              <span style={{ fontSize: 12, color: 'var(--text-mid)', fontWeight: 500 }}>
                {STATUS_STYLE[s].label}
              </span>
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{
              width: 22, height: 14, borderRadius: 5,
              background: STATUS_STYLE.empty.bg, border: '1.5px dashed var(--border-mid)',
            }} />
            <span style={{ fontSize: 12, color: 'var(--text-light)', fontWeight: 500 }}>Not logged</span>
          </div>
        </div>

        {/* Grid */}
        <div style={{
          background: 'white', borderRadius: 20,
          border: '1.5px solid var(--border)',
          boxShadow: '0 4px 20px rgba(39,23,6,0.07)',
          overflow: 'hidden',
        }}>
          {/* Header row — clickable day names */}
          <div style={{
            display: 'grid', gridTemplateColumns: '52px repeat(7, 1fr)',
            borderBottom: '1.5px solid var(--border)',
            background: 'var(--surface-warm)',
          }}>
            <div />
            {DAYS.map(day => {
              const dateIso = WEEK_DATES[day.key]
              const isToday = dateIso === TODAY_ISO
              const dateLabel = new Date(dateIso + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
              return (
                <button
                  key={day.key}
                  ref={el => { headerRefs.current[day.key] = el }}
                  onClick={() => handleDayClick(day.key)}
                  style={{
                    padding: '10px 6px', textAlign: 'center',
                    fontSize: 12, fontWeight: 600,
                    color: openDay === day.key ? '#E8735A' : isToday ? 'var(--coral)' : 'var(--text-mid)',
                    borderLeft: '1px solid var(--border)',
                    letterSpacing: '0.2px',
                    background: openDay === day.key ? '#FDF1EE' : 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'color 0.15s, background 0.15s',
                    fontFamily: "'Outfit', sans-serif",
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                  }}
                >
                  <span>{day.label}</span>
                  <span style={{
                    fontSize: 10, fontWeight: 400,
                    color: isToday ? 'var(--coral)' : 'var(--text-light)',
                  }}>{dateLabel}</span>
                  {isToday && (
                    <span style={{
                      width: 3, height: 3, borderRadius: '50%',
                      background: 'var(--coral)', display: 'block',
                    }} />
                  )}
                </button>
              )
            })}
          </div>

          {/* Meal rows — dots only, no text */}
          {MEALS.map((meal, mi) => (
            <div key={meal.key} style={{
              display: 'grid', gridTemplateColumns: '52px repeat(7, 1fr)',
              borderBottom: mi < MEALS.length - 1 ? '1px solid var(--border)' : 'none',
            }}>
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', padding: '8px 4px', gap: 4,
                borderRight: '1px solid var(--border)', background: 'var(--surface-warm)',
              }}>
                <span style={{ fontSize: 16 }}>{meal.icon}</span>
                <span style={{
                  fontSize: 9, fontWeight: 700, color: 'var(--text-light)',
                  textTransform: 'uppercase', letterSpacing: '0.5px',
                }}>{meal.label}</span>
              </div>

              {DAYS.map(day => {
                const slot = getSlot(day.key, meal.key)
                const log  = slot?.id ? latestLogBySlot[slot.id] : null
                const s    = STATUS_STYLE[log?.status || 'empty']

                return (
                  <div
                    key={day.key}
                    style={{
                      background: s.bg,
                      borderLeft: '1px solid var(--border)',
                      minHeight: 90,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      ...(log?.status === 'empty' || !log ? { border: '1.5px dashed transparent' } : {}),
                    }}
                  >
                    {s.dot ? (
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: s.dot }} />
                    ) : (
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--border-mid)', opacity: 0.4 }} />
                    )}
                  </div>
                )
              })}
            </div>
          ))}
      </div>


      {/* Day popover — fixed, viewport-safe, closes on outside click */}
      {openDay && openDayObj && (
        <DayPopover
          day={openDayObj}
          macros={macrosByDay[openDay]}
          popoverRef={popoverRef}
          style={{ position: 'fixed', top: popoverPos.top, left: popoverPos.left, zIndex: 50 }}
        />
      )}
    </div>
  )
}
