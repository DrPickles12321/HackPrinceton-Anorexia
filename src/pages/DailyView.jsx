import { useEffect, useState, useMemo, useCallback } from 'react'
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
const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

function getTodayKey() {
  const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
  return days[new Date().getDay()]
}

// Returns { mon: '2026-04-21', ... } offset weeks from current week (0 = this week)
function getWeekDates(offset = 0) {
  const today = new Date()
  const dow = today.getDay()
  const diff = dow === 0 ? -6 : 1 - dow
  const monday = new Date(today)
  monday.setDate(today.getDate() + diff + offset * 7)
  const result = {}
  DAY_KEYS.forEach((key, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    result[key] = d.toISOString().slice(0, 10)
  })
  return result
}

const TODAY_ISO = new Date().toISOString().slice(0, 10)

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
                onClick={() => hasItems && onQuickLog(slot, opt.key)}
                disabled={!hasItems}
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

// ─── Parent note section ──────────────────────────────────────────────────────

function ParentNoteSection({ note, selectedDate, onSave }) {
  const [body, setBody] = useState(note?.body || '')
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState('idle')

  useEffect(() => {
    setBody(note?.body || '')
    setSaveStatus('idle')
  }, [selectedDate])

  const isDirty = body.trim() !== (note?.body?.trim() || '')
  const isRead = !!note?.read_at

  async function handleSave() {
    if (!isDirty || isSaving) return
    setIsSaving(true)
    setSaveStatus('idle')
    try {
      await onSave(body.trim())
      setSaveStatus('saved')
    } catch {
      setSaveStatus('error')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div style={{
      marginTop: 24,
      background: 'white', borderRadius: 16,
      border: '1.5px solid var(--border)',
      boxShadow: '0 2px 12px rgba(39,23,6,0.06)',
      padding: '20px 24px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-dark)' }}>Parent Note</div>
          <div style={{ fontSize: 12, color: 'var(--text-light)', marginTop: 2 }}>Leave a note for your care team</div>
        </div>
        {isRead && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'var(--mint-light)', borderRadius: 10, padding: '5px 10px',
            border: '1px solid var(--mint-mid)',
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--mint)', flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: 'var(--mint)', fontWeight: 500 }}>Clinician read</span>
          </div>
        )}
      </div>
      <textarea
        value={body}
        onChange={e => { setBody(e.target.value); setSaveStatus('idle') }}
        placeholder="Write a note for your care team..."
        rows={3}
        maxLength={1000}
        style={{
          width: '100%', border: '1.5px solid var(--border-mid)', borderRadius: 10,
          padding: '10px 12px', fontSize: 13, fontFamily: "'Outfit', sans-serif",
          resize: 'none', outline: 'none', boxSizing: 'border-box', color: 'var(--text-dark)',
          lineHeight: 1.6,
        }}
      />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
        <span style={{ fontSize: 11, color: 'var(--text-light)' }}>{body.length} / 1000</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {saveStatus === 'saved' && !isDirty && (
            <span style={{ fontSize: 11, color: 'var(--mint)', fontWeight: 500 }}>Saved</span>
          )}
          {saveStatus === 'error' && (
            <span style={{ fontSize: 11, color: 'var(--pink)', fontWeight: 500 }}>Failed to save</span>
          )}
          <button
            onClick={handleSave}
            disabled={!isDirty || isSaving}
            style={{
              background: 'linear-gradient(135deg, var(--coral) 0%, var(--pink) 100%)',
              color: 'white', border: 'none', borderRadius: 10, padding: '7px 16px',
              fontSize: 12, fontWeight: 600, cursor: (!isDirty || isSaving) ? 'default' : 'pointer',
              opacity: (!isDirty || isSaving) ? 0.4 : 1,
              fontFamily: "'Outfit', sans-serif", transition: 'opacity 0.15s',
            }}
          >
            {isSaving ? 'Saving…' : note?.id ? 'Update note' : 'Save note'}
          </button>
        </div>
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
  const { mealSlots, foodItems, mealLogs, clinicianNotes = [], parentNotes = [], clinicianNotesRead = {}, mealStatuses = {}, insertMealLog, saveParentNote, markClinicianNoteRead, setMealStatus } = useOutletContext()
  const [selectedDay, setSelectedDay] = useState(getTodayKey)
  const [weekOffset, setWeekOffset] = useState(0)
  const [activeDrag, setActiveDrag] = useState(null)
  const [allMealItems, setAllMealItems] = useState(() => {
    try {
      return JSON.parse(window.localStorage.getItem('parentMealItemsByDate') || '{}')
    } catch { return {} }
  })

  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset])
  const [mealTimes, setMealTimes] = useState(() => {
    try {
      const stored = window.localStorage.getItem('parentDailyMealTimes')
      return stored ? JSON.parse(stored) : DEFAULT_MEAL_TIMES
    } catch { return DEFAULT_MEAL_TIMES }
  })

  const selectedDate = weekDates[selectedDay]
  const mealItems = allMealItems[selectedDate] || EMPTY_MEAL_ITEMS

  function setMealItemsForDay(updater) {
    setAllMealItems(prev => {
      const next = { ...prev, [selectedDate]: updater(prev[selectedDate] || EMPTY_MEAL_ITEMS) }
      window.localStorage.setItem('parentMealItemsByDate', JSON.stringify(next))
      return next
    })
  }

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
    setMealItemsForDay(prev => ({ ...prev, [mealType]: [...prev[mealType], food] }))
  }

  function removeItem(mealType, index) {
    setMealItemsForDay(prev => ({ ...prev, [mealType]: prev[mealType].filter((_, i) => i !== index) }))
  }

  async function handleQuickLog(slot, mealType, status) {
    setMealStatus(selectedDate, mealType, status)
    if (slot?.id) {
      try { await insertMealLog({ slotId: slot.id, status, note: null }) } catch {}
    }
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={e => { const f = e.active.data.current?.food; if (f) setActiveDrag(f) }}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveDrag(null)}
    >
      <div style={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden', maxWidth: 1280, margin: '0 auto', width: '100%' }}>

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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <button
                onClick={() => setWeekOffset(o => o - 1)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-light)', fontSize: 18, padding: '0 4px', fontFamily: 'inherit' }}
              >‹</button>
              <span style={{ fontSize: 12, color: weekOffset === 0 ? 'var(--coral)' : 'var(--text-light)', fontWeight: 600 }}>
                {weekOffset === 0 ? 'This week' : weekOffset === -1 ? 'Last week' : weekOffset === 1 ? 'Next week' : (() => {
                  const mon = weekDates['mon']
                  const sun = weekDates['sun']
                  return `${new Date(mon + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${new Date(sun + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                })()}
                {weekOffset !== 0 && (
                  <button
                    onClick={() => setWeekOffset(0)}
                    style={{ marginLeft: 8, background: 'none', border: '1px solid var(--border-mid)', borderRadius: 6, cursor: 'pointer', color: 'var(--coral)', fontSize: 10, fontWeight: 600, padding: '2px 7px', fontFamily: 'inherit' }}
                  >Today</button>
                )}
              </span>
              <button
                onClick={() => setWeekOffset(o => o + 1)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-light)', fontSize: 18, padding: '0 4px', fontFamily: 'inherit' }}
              >›</button>
            </div>
            <div style={{
              display: 'flex', gap: 4, background: 'white',
              borderRadius: 16, padding: 4,
              border: '1.5px solid var(--border)',
              boxShadow: '0 2px 8px rgba(39,23,6,0.05)',
            }}>
              {DAYS.map(day => {
                const dateIso = weekDates[day.key]
                const isToday = dateIso === TODAY_ISO
                const isSelected = day.key === selectedDay
                const dateObj = new Date(dateIso + 'T12:00:00')
                const dateLabel = `${dateObj.getMonth() + 1}/${dateObj.getDate()}`
                return (
                  <button
                    key={day.key}
                    onClick={() => setSelectedDay(day.key)}
                    style={{
                      flex: 1, padding: '7px 4px', borderRadius: 12, border: 'none',
                      background: isSelected
                        ? 'linear-gradient(135deg, var(--coral) 0%, var(--pink) 100%)'
                        : 'transparent',
                      color: isSelected ? 'white' : isToday ? 'var(--coral)' : 'var(--text-light)',
                      fontWeight: isSelected ? 600 : isToday ? 600 : 400,
                      fontSize: 11, cursor: 'pointer', transition: 'all 0.15s',
                      boxShadow: isSelected ? '0 2px 8px rgba(184,85,53,0.3)' : 'none',
                      fontFamily: "'Outfit', sans-serif",
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                    }}
                  >
                    <span>{day.label}</span>
                    <span style={{ fontSize: 10, opacity: isSelected ? 0.85 : 0.7 }}>{dateLabel}</span>
                    {isToday && !isSelected && (
                      <span style={{
                        width: 3, height: 3, borderRadius: '50%',
                        background: 'var(--coral)', display: 'block',
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
              const localStatus = (mealStatuses[selectedDate] || {})[meal.key]
              const latestLog = localStatus
                ? { status: localStatus }
                : getLatestLog(slot?.id)
              return (
                <MealCard
                  key={meal.key}
                  meal={meal}
                  slot={slot}
                  items={mealItems[meal.key]}
                  onRemove={index => removeItem(meal.key, index)}
                  latestLog={latestLog}
                  onQuickLog={(slot, status) => handleQuickLog(slot, meal.key, status)}
                  time={mealTimes[meal.key]}
                  onTimeChange={updateMealTime}
                />
              )
            })}
          </div>

          {/* Daily progress rings */}
          <DailyProgressPanel mealItems={mealItems} />

          {/* Parent note for this day */}
          <ParentNoteSection
            note={parentNotes.find(n => n.date === selectedDate) || null}
            selectedDate={selectedDate}
            onSave={body => {
              const existing = parentNotes.find(n => n.date === selectedDate)
              return saveParentNote({ date: selectedDate, body, existingNoteId: existing?.id || null })
            }}
          />

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

          <div style={{ marginBottom: 22 }}>
            <div style={{
              fontSize: 10, fontWeight: 700, color: 'var(--text-light)',
              letterSpacing: '0.7px', textTransform: 'uppercase', marginBottom: 9,
            }}>Clinician Notes</div>
            {(() => {
              const today = new Date().toISOString().slice(0, 10)
              const todayNote = clinicianNotes.find(n => n.created_at?.slice(0, 10) === today)
              const latest = todayNote || clinicianNotes[0] || null
              if (!latest) return (
                <div style={{
                  background: 'var(--peach-light)', borderRadius: 14, padding: '13px',
                  fontSize: 12, color: 'var(--text-light)', lineHeight: 1.6, fontStyle: 'italic',
                  border: '1px solid var(--peach-mid)',
                }}>No notes yet.</div>
              )
              const isRead = !!clinicianNotesRead[latest.id]
              return (
                <div style={{
                  background: isRead ? 'var(--peach-light)' : '#FFF7ED',
                  borderRadius: 14, padding: '13px',
                  border: isRead ? '1px solid var(--peach-mid)' : '1.5px solid #FBB54A',
                }}>
                  {!isRead && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 7 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#F59E0B', flexShrink: 0, display: 'block' }} />
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#D97706', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Unread</span>
                    </div>
                  )}
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--text-mid)', lineHeight: 1.6 }}>{latest.body}</p>
                  {latest.created_at && (
                    <p style={{ margin: '6px 0 0', fontSize: 10, color: 'var(--text-light)' }}>
                      {new Date(latest.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  )}
                  {isRead ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 8 }}>
                      <span style={{ fontSize: 10, color: 'var(--mint)', fontWeight: 500 }}>✓ Marked as read</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => markClinicianNoteRead?.(latest.id)}
                      style={{
                        marginTop: 10, background: 'none', border: '1px solid #FBB54A',
                        borderRadius: 8, padding: '4px 10px', fontSize: 11, fontWeight: 600,
                        color: '#D97706', cursor: 'pointer', fontFamily: "'Outfit', sans-serif",
                      }}
                    >Mark as read</button>
                  )}
                </div>
              )
            })()}
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
