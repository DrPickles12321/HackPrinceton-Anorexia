import { useEffect, useState, useMemo } from 'react'
import { useOutletContext } from 'react-router-dom'
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, useDroppable } from '@dnd-kit/core'
import FoodSidebar from '../components/FoodSidebar'
import FoodCardPreview from '../components/FoodCardPreview'
import SupplementChecklist from '../components/SupplementChecklist'
import { lookupNutrition } from '../lib/nutritionService'
import { useNutritionalTargets } from '../contexts/NutritionalTargetsContext'

const DAYS = [
  { key: 'mon', label: 'Mon' },
  { key: 'tue', label: 'Tue' },
  { key: 'wed', label: 'Wed' },
  { key: 'thu', label: 'Thu' },
  { key: 'fri', label: 'Fri' },
  { key: 'sat', label: 'Sat' },
  { key: 'sun', label: 'Sun' },
]

const DEFAULT_MEAL_TIMES = {
  breakfast: '08:00',
  lunch: '13:00',
  snack: '15:30',
  dinner: '19:00',
}

const MEALS = [
  { key: 'breakfast', label: 'Breakfast', icon: '☀️', color: 'var(--coral)', bg: 'var(--coral-light)' },
  { key: 'lunch',     label: 'Lunch',     icon: '🥗', color: 'var(--peach)', bg: 'var(--peach-light)' },
  { key: 'snack',     label: 'Snack',     icon: '🍎', color: 'var(--pink)',  bg: 'var(--pink-light)' },
  { key: 'dinner',    label: 'Dinner',    icon: '🌙', color: 'var(--mint)',  bg: 'var(--mint-light)' },
]

const STATUS_OPTIONS = [
  { key: 'okay',      emoji: '😌', label: 'Ok',   color: 'var(--mint)',  bg: 'var(--mint-light)' },
  { key: 'difficult', emoji: '😰', label: 'Hard', color: 'var(--peach)', bg: 'var(--peach-light)' },
  { key: 'refused',   emoji: '🙅', label: 'No',   color: 'var(--pink)',  bg: 'var(--pink-light)' },
]

const RING_NUTRIENTS = [
  { key: 'protein',       label: 'Protein', color: '#E8735A', darkColor: '#C25A3F', getVal: info => info.protein_g || 0 },
  { key: 'carbs',         label: 'Carbs',   color: '#F5A623', darkColor: '#D08B15', getVal: info => info.carbs_g || 0 },
  { key: 'fruitsVeggies', label: 'F&V',     color: '#7BC67E', darkColor: '#5AA85D', getVal: info => info.plate_zone === 'produce' ? 80 : 0 },
]

const EMPTY_MEAL_ITEMS = { breakfast: [], lunch: [], snack: [], dinner: [] }

function getTodayKey() {
  const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
  return days[new Date().getDay()]
}

function parseTimeValue(value) {
  const [hour = '08', minute = '00'] = (value || '08:00').split(':')
  const numericHour = Number(hour)
  const displayHour = numericHour % 12 === 0 ? 12 : numericHour % 12
  return {
    hour: String(displayHour),
    minute: String(minute).padStart(2, '0'),
    period: numericHour >= 12 ? 'PM' : 'AM',
  }
}

function build24HourTime(hourValue, minuteValue, period) {
  const hour = Number(hourValue)
  const minute = Number(minuteValue)
  if (!Number.isInteger(hour) || hour < 1 || hour > 12) return null
  if (!Number.isInteger(minute) || minute < 0 || minute > 59) return null
  const normalizedHour = period === 'PM'
    ? (hour === 12 ? 12 : hour + 12)
    : (hour === 12 ? 0 : hour)
  return `${String(normalizedHour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

// ─── Drop zone: always droppable, renders food chips ─────────────────────────

function DropZone({ mealType, items, onRemove }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `meal-${mealType}`,
    data: { mealType },
  })

  return (
    <div
      ref={setNodeRef}
      style={{
        flex: 1, minHeight: 48, borderRadius: 12,
        border: items.length === 0
          ? `2px dashed ${isOver ? 'var(--coral)' : 'var(--border-mid)'}`
          : '1.5px solid var(--border-mid)',
        background: isOver ? 'var(--coral-light)' : (items.length > 0 ? 'var(--surface-warm)' : 'transparent'),
        padding: items.length > 0 ? '8px 10px' : '0 14px',
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6,
        transition: 'all 0.15s',
      }}
    >
      {items.length === 0 ? (
        <span style={{ fontSize: 12, color: isOver ? 'var(--coral)' : 'var(--text-light)' }}>
          {isOver ? 'Drop here ↓' : '+ drag a food here'}
        </span>
      ) : (
        <>
          {items.map((food, i) => (
            <span key={i} style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              background: 'white', border: '1px solid var(--border-mid)',
              borderRadius: 8, padding: '4px 8px 4px 10px',
              fontSize: 13, fontWeight: 500, color: 'var(--text-dark)',
              boxShadow: '0 1px 3px rgba(39,23,6,0.06)',
            }}>
              {food.name}
              <button
                onClick={e => { e.stopPropagation(); onRemove(i) }}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-light)', fontSize: 16, lineHeight: 1,
                  padding: '0 2px', display: 'flex', alignItems: 'center',
                  fontFamily: 'inherit',
                }}
              >×</button>
            </span>
          ))}
          {isOver && (
            <span style={{ fontSize: 12, color: 'var(--coral)', fontWeight: 500, opacity: 0.8 }}>
              + drop here
            </span>
          )}
        </>
      )}
    </div>
  )
}

// ─── Meal card ────────────────────────────────────────────────────────────────

function MealCard({ meal, slot, items, onRemove, latestLog, onQuickLog, time, onTimeChange }) {
  const loggedStatus = latestLog?.status || null
  const hasItems = items.length > 0
  const initialTime = parseTimeValue(time)
  const [pendingTime, setPendingTime] = useState(initialTime)
  const [lastValidHour, setLastValidHour] = useState(initialTime.hour)

  useEffect(() => {
    const nextTime = parseTimeValue(time)
    setPendingTime(nextTime)
    setLastValidHour(nextTime.hour)
  }, [time])

  const handleHourChange = value => {
    const next = value.replace(/[^0-9]/g, '').slice(0, 2)
    if (next === '') { setPendingTime(prev => ({ ...prev, hour: '' })); return }
    const numeric = Number(next)
    if (numeric === 0) { setPendingTime(prev => ({ ...prev, hour: next })); return }
    if (numeric >= 1 && numeric <= 12) {
      setPendingTime(prev => ({ ...prev, hour: String(numeric) }))
      setLastValidHour(String(numeric))
    }
  }

  const handleHourBlur = () => {
    const hourText = pendingTime.hour.trim() || lastValidHour
    const nextTime = build24HourTime(hourText, pendingTime.minute, pendingTime.period)
    if (nextTime) {
      setPendingTime(prev => ({ ...prev, hour: String(Number(hourText)) }))
      setLastValidHour(String(Number(hourText)))
      onTimeChange(meal.key, nextTime)
    }
  }

  const handleMinuteChange = value => {
    setPendingTime(prev => ({ ...prev, minute: value.replace(/[^0-9]/g, '').slice(0, 2) }))
  }

  const handleMinuteBlur = () => {
    const minuteText = pendingTime.minute.trim() || '00'
    const nextTime = build24HourTime(pendingTime.hour || '1', minuteText, pendingTime.period)
    if (nextTime) {
      setPendingTime(prev => ({ ...prev, minute: String(Number(minuteText)).padStart(2, '0') }))
      onTimeChange(meal.key, nextTime)
    }
  }

  return (
    <div style={{
      background: 'white', borderRadius: 18,
      border: '1.5px solid var(--border)',
      boxShadow: '0 2px 12px rgba(39,23,6,0.06)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        background: meal.bg, padding: '12px 18px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <span style={{ fontSize: 17 }}>{meal.icon}</span>
          <span style={{ fontWeight: 600, fontSize: 14, color: meal.color }}>{meal.label}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.88)', borderRadius: 10, padding: '5px 8px' }}>
          {(() => {
            const { hour, minute, period } = pendingTime
            const setPeriod = nextPeriod => {
              const nextTime = build24HourTime(hour || lastValidHour, minute || '00', nextPeriod)
              if (nextTime) onTimeChange(meal.key, nextTime)
              setPendingTime(prev => ({ ...prev, period: nextPeriod }))
            }
            return (
              <>
                <input type="text" inputMode="numeric" value={hour}
                  onChange={e => handleHourChange(e.target.value)} onBlur={handleHourBlur}
                  style={{ width: 24, border: 'none', background: 'transparent', color: meal.color, fontSize: 12, fontWeight: 700, textAlign: 'center', outline: 'none' }}
                />
                <span style={{ color: meal.color, fontSize: 12, fontWeight: 700 }}>:</span>
                <input type="text" inputMode="numeric" value={minute}
                  onChange={e => handleMinuteChange(e.target.value)} onBlur={handleMinuteBlur}
                  style={{ width: 28, border: 'none', background: 'transparent', color: meal.color, fontSize: 12, fontWeight: 700, textAlign: 'center', outline: 'none' }}
                />
                <div style={{ display: 'flex', gap: 4, marginLeft: 4 }}>
                  {['AM', 'PM'].map(option => (
                    <button key={option} type="button" onClick={() => setPeriod(option)} style={{
                      borderRadius: 8, border: 'none', padding: '4px 6px',
                      background: period === option ? meal.color : 'rgba(255,255,255,0.7)',
                      color: period === option ? 'white' : meal.color,
                      fontSize: 10, fontWeight: 700, cursor: 'pointer',
                    }}>{option}</button>
                  ))}
                </div>
              </>
            )
          })()}
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <DropZone mealType={meal.key} items={items} onRemove={onRemove} />

        <div style={{ display: 'flex', gap: 6, flexShrink: 0, paddingTop: items.length > 1 ? 4 : 0 }}>
          {STATUS_OPTIONS.map(opt => {
            const selected = loggedStatus === opt.key
            return (
              <button
                key={opt.key}
                onClick={() => slot?.id && onQuickLog(slot, opt.key)}
                disabled={!slot?.id || !hasItems}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                  padding: '7px 11px', borderRadius: 10,
                  border: `1.5px solid ${selected ? opt.color : 'var(--border)'}`,
                  background: selected ? opt.bg : 'white',
                  cursor: hasItems ? 'pointer' : 'default',
                  opacity: hasItems ? 1 : 0.38,
                  transition: 'all 0.15s', minWidth: 50,
                  fontFamily: "'Outfit', sans-serif",
                }}
              >
                <span style={{ fontSize: 18 }}>{opt.emoji}</span>
                <span style={{ fontSize: 10, fontWeight: 500, color: selected ? opt.color : 'var(--text-light)' }}>
                  {opt.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Progress ring ────────────────────────────────────────────────────────────

function ProgressRing({ value, target, color, darkColor, label }) {
  const size = 80
  const strokeWidth = 7
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const pct = Math.min(value / Math.max(target, 1), 1)
  const offset = circumference * (1 - pct)
  const met = value >= target

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size}>
          <circle cx={size / 2} cy={size / 2} r={radius}
            fill="none" stroke="#E0E0E0" strokeWidth={strokeWidth} />
          <circle cx={size / 2} cy={size / 2} r={radius}
            fill="none"
            stroke={met ? darkColor : color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            style={{ transition: 'stroke-dashoffset 0.4s ease' }}
          />
        </svg>
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 700,
          color: met ? darkColor : 'var(--text-mid)',
        }}>
          {value}g
        </div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 12, color: 'var(--text-light)', fontWeight: 500 }}>{label}</div>
        {met && <div style={{ fontSize: 11, color: darkColor, fontWeight: 700, marginTop: 1 }}>✓</div>}
      </div>
    </div>
  )
}

// ─── Daily progress panel ─────────────────────────────────────────────────────

function DailyProgressPanel({ mealItems }) {
  const { targets } = useNutritionalTargets()

  const totals = useMemo(() => {
    const all = Object.values(mealItems).flat()
    const sums = { protein: 0, carbs: 0, fruitsVeggies: 0 }
    for (const food of all) {
      const info = lookupNutrition(food.name, food.category)
      for (const n of RING_NUTRIENTS) sums[n.key] += n.getVal(info)
    }
    return {
      protein:       Math.round(sums.protein),
      carbs:         Math.round(sums.carbs),
      fruitsVeggies: Math.round(sums.fruitsVeggies),
    }
  }, [mealItems])

  const metCount = RING_NUTRIENTS.filter(n => totals[n.key] >= targets[n.key]).length

  return (
    <div style={{
      marginTop: 24,
      background: 'white', borderRadius: 16,
      border: '1.5px solid var(--border)',
      boxShadow: '0 2px 12px rgba(39,23,6,0.06)',
      padding: '20px 24px',
    }}>
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: '#E8735A' }}>Daily Progress</div>
        <div style={{ fontSize: 12, color: 'var(--text-light)', marginTop: 2 }}>
          {metCount} of 3 goals met
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 40 }}>
        {RING_NUTRIENTS.map(n => (
          <ProgressRing
            key={n.key}
            value={totals[n.key]}
            target={targets[n.key]}
            color={n.color}
            darkColor={n.darkColor}
            label={n.label}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Main view ────────────────────────────────────────────────────────────────

export default function DailyView() {
  const { mealSlots, foodItems, mealLogs, insertMealLog } = useOutletContext()
  const [selectedDay, setSelectedDay] = useState(getTodayKey)
  const [activeDrag, setActiveDrag] = useState(null)
  const [mealItems, setMealItems] = useState(EMPTY_MEAL_ITEMS)
  const [mealTimes, setMealTimes] = useState(() => {
    try {
      const stored = window.localStorage.getItem('parentDailyMealTimes')
      return stored ? JSON.parse(stored) : DEFAULT_MEAL_TIMES
    } catch { return DEFAULT_MEAL_TIMES }
  })

  // Reset food items when switching days
  useEffect(() => {
    setMealItems(EMPTY_MEAL_ITEMS)
  }, [selectedDay])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  function updateMealTime(mealType, value) {
    const nextTimes = { ...mealTimes, [mealType]: value }
    setMealTimes(nextTimes)
    window.localStorage.setItem('parentDailyMealTimes', JSON.stringify(nextTimes))
  }

  function getSlot(mealType) {
    return mealSlots.find(s => s.day === selectedDay && s.meal_type === mealType)
      || { id: null, day: selectedDay, meal_type: mealType, assigned_food_id: null }
  }

  function getLatestLog(slotId) {
    if (!slotId) return null
    return [...mealLogs]
      .filter(l => l.meal_slot_id === slotId)
      .sort((a, b) => new Date(b.logged_at) - new Date(a.logged_at))[0] || null
  }

  function handleDragEnd(event) {
    const { active, over } = event
    setActiveDrag(null)
    if (!over) return
    const food = active.data.current?.food
    const mealType = over.data.current?.mealType
    if (!food || !mealType) return
    setMealItems(prev => ({
      ...prev,
      [mealType]: [...prev[mealType], food],
    }))
  }

  function removeItem(mealType, index) {
    setMealItems(prev => ({
      ...prev,
      [mealType]: prev[mealType].filter((_, i) => i !== index),
    }))
  }

  async function handleQuickLog(slot, status) {
    if (!slot?.id) return
    try { await insertMealLog({ slotId: slot.id, status, note: null }) } catch {}
  }

  const todayKey = getTodayKey()

  return (
    <DndContext
      sensors={sensors}
      onDragStart={e => { const f = e.active.data.current?.food; if (f) setActiveDrag(f) }}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveDrag(null)}
    >
      <div style={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden' }}>

        {/* Left sidebar */}
        <aside style={{
          width: 272, flexShrink: 0,
          borderRight: '1px solid var(--border)',
          overflowY: 'auto', background: 'white',
        }}>
          <FoodSidebar />
        </aside>

        {/* Center */}
        <main style={{ flex: 1, padding: '24px 28px', overflowY: 'auto' }}>

          {/* Day selector */}
          <div style={{ marginBottom: 24 }}>
            <div style={{
              display: 'flex', gap: 4, background: 'white',
              borderRadius: 16, padding: 4,
              border: '1.5px solid var(--border)',
              boxShadow: '0 2px 8px rgba(39,23,6,0.05)',
            }}>
              {DAYS.map(day => {
                const isToday = day.key === todayKey
                const isSelected = day.key === selectedDay
                return (
                  <button
                    key={day.key}
                    onClick={() => setSelectedDay(day.key)}
                    style={{
                      flex: 1, padding: '9px 4px', borderRadius: 12, border: 'none',
                      background: isSelected
                        ? 'linear-gradient(135deg, var(--coral) 0%, var(--pink) 100%)'
                        : 'transparent',
                      color: isSelected ? 'white' : isToday ? 'var(--text-mid)' : 'var(--text-light)',
                      fontWeight: isSelected ? 600 : isToday ? 500 : 400,
                      fontSize: 12, cursor: 'pointer', transition: 'all 0.15s',
                      position: 'relative',
                      boxShadow: isSelected ? '0 2px 8px rgba(184,85,53,0.3)' : 'none',
                      fontFamily: "'Outfit', sans-serif",
                    }}
                  >
                    {day.label}
                    {isToday && !isSelected && (
                      <span style={{
                        position: 'absolute', bottom: 4, left: '50%',
                        transform: 'translateX(-50%)',
                        width: 3, height: 3, borderRadius: '50%',
                        background: 'var(--coral)',
                      }} />
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Meal cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {MEALS.map(meal => {
              const slot = getSlot(meal.key)
              return (
                <MealCard
                  key={meal.key}
                  meal={meal}
                  slot={slot}
                  items={mealItems[meal.key]}
                  onRemove={index => removeItem(meal.key, index)}
                  latestLog={getLatestLog(slot?.id)}
                  onQuickLog={handleQuickLog}
                  time={mealTimes[meal.key]}
                  onTimeChange={updateMealTime}
                />
              )
            })}
          </div>

          {/* Daily progress rings */}
          <DailyProgressPanel mealItems={mealItems} />

          <p style={{
            fontSize: 11, color: 'var(--text-light)', lineHeight: 1.6,
            borderTop: '1px solid var(--border)', paddingTop: 18, marginTop: 28,
          }}>
            This tool supports meal planning between families and their care team. Not a substitute for medical advice.
          </p>
        </main>

        {/* Right sidebar */}
        <aside style={{
          width: 214, flexShrink: 0,
          borderLeft: '1px solid var(--border)',
          padding: '24px 18px', overflowY: 'auto', background: 'white',
        }}>
          <div style={{ textAlign: 'center', marginBottom: 22 }}>
            <div style={{
              width: 44, height: 44, borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--coral) 0%, var(--pink) 100%)',
              margin: '0 auto 10px',
              display: 'flex', alignItems: 'center',
              justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 16,
              boxShadow: '0 3px 10px rgba(184,85,53,0.28)',
            }}>P</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-dark)' }}>Parent</div>
          </div>

          <div style={{
            background: 'var(--mint-light)', borderRadius: 12, padding: '9px 12px',
            marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8,
            border: '1px solid var(--mint-mid)',
          }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--mint)', flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: 'var(--mint)', fontWeight: 500 }}>Clinician read</span>
          </div>

          <div style={{ marginBottom: 22 }}>
            <div style={{
              fontSize: 10, fontWeight: 700, color: 'var(--text-light)',
              letterSpacing: '0.7px', textTransform: 'uppercase', marginBottom: 9,
            }}>Clinician Notes</div>
            <div style={{
              background: 'var(--peach-light)', borderRadius: 14, padding: '13px',
              fontSize: 13, color: 'var(--text-mid)', lineHeight: 1.6, fontStyle: 'italic',
              border: '1px solid var(--peach-mid)',
            }}>
              "Great progress this week on identifying patterns!"
            </div>
          </div>

          <div>
            <div style={{
              fontSize: 10, fontWeight: 700, color: 'var(--text-light)',
              letterSpacing: '0.7px', textTransform: 'uppercase', marginBottom: 9,
            }}>This Week</div>
            {[
              { label: 'Okay',      count: mealLogs.filter(l => l.status === 'okay').length,      color: 'var(--mint)',  bg: 'var(--mint-light)',  border: 'var(--mint-mid)' },
              { label: 'Difficult', count: mealLogs.filter(l => l.status === 'difficult').length,  color: 'var(--peach)', bg: 'var(--peach-light)', border: 'var(--peach-mid)' },
              { label: 'Refused',   count: mealLogs.filter(l => l.status === 'refused').length,    color: 'var(--pink)',  bg: 'var(--pink-light)',  border: 'var(--pink-mid)' },
            ].map(s => (
              <div key={s.label} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '8px 11px', borderRadius: 10, background: s.bg,
                marginBottom: 7, border: `1px solid ${s.border}`,
              }}>
                <span style={{ fontSize: 12, color: s.color, fontWeight: 500 }}>{s.label}</span>
                <span style={{ fontSize: 16, fontWeight: 700, color: s.color }}>{s.count}</span>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 22 }}>
            <SupplementChecklist mealSlots={mealSlots} foodItems={foodItems} />
          </div>
        </aside>
      </div>

      <DragOverlay dropAnimation={{ duration: 150, easing: 'ease-out' }}>
        {activeDrag ? <FoodCardPreview name={activeDrag.name} category={activeDrag.category} floating /> : null}
      </DragOverlay>
    </DndContext>
  )
}
