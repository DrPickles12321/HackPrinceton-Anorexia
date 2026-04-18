import { useDroppable } from '@dnd-kit/core'
import NutritionBadge from './NutritionBadge'

const DAYS = [
  { key: 'mon', label: 'Mon' },
  { key: 'tue', label: 'Tue' },
  { key: 'wed', label: 'Wed' },
  { key: 'thu', label: 'Thu' },
  { key: 'fri', label: 'Fri' },
  { key: 'sat', label: 'Sat', isWeekend: true },
  { key: 'sun', label: 'Sun', isWeekend: true },
]

const MEAL_TYPES = [
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'lunch',     label: 'Lunch' },
  { key: 'dinner',    label: 'Dinner' },
  { key: 'snack',     label: 'Snack' },
]

const DAY_LABELS_FULL = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' }
const SLOT_BASE = 'border rounded-lg p-2 min-h-[80px] transition-colors duration-150 relative'
const STATUS_DOT = { okay: 'bg-green-500', difficult: 'bg-yellow-500', refused: 'bg-red-500' }
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function getWeekDates() {
  const today = new Date()
  const day = today.getDay()
  const monday = new Date(today)
  monday.setDate(today.getDate() - (day === 0 ? 6 : day - 1))
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

function StatusBadge({ log }) {
  if (!log) return null
  return (
    <span
      className={`absolute top-1 right-1 w-3 h-3 rounded-full ${STATUS_DOT[log.status] || ''}`}
      aria-label={`Last logged as ${log.status}`}
      title={`${log.status}${log.note ? ': ' + log.note : ''}`}
    />
  )
}

function ParentMealSlot({ slot, foodName, foodCategory, onSlotClick, isWeekend }) {
  const { setNodeRef, isOver } = useDroppable({
    id: slot.id || `empty-${slot.day}-${slot.meal_type}`,
    data: { slot },
  })
  const filled = !!slot.assigned_food_id

  return (
    <div
      ref={setNodeRef}
      onClick={() => filled && onSlotClick(slot)}
      onKeyDown={e => filled && (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onSlotClick(slot))}
      role={filled ? 'button' : undefined}
      tabIndex={filled ? 0 : undefined}
      aria-label={filled ? `${DAY_LABELS_FULL[slot.day]} ${slot.meal_type}, ${foodName}. Click to log meal.` : `${DAY_LABELS_FULL[slot.day]} ${slot.meal_type}, empty. Drag a food here.`}
      className={`${SLOT_BASE}
        ${isWeekend ? 'bg-blue-50/30' : 'bg-white'}
        ${filled ? 'cursor-pointer hover:bg-gray-50 hover:shadow-md' : 'border-dashed border-gray-300 cursor-default'}
        ${isOver ? '!bg-blue-100 !border-blue-400 border-2' : 'border-gray-200'}
      `}
    >
      {filled ? (
        <>
          <span className="text-sm text-gray-900 leading-tight break-words pr-4 block">{foodName}</span>
          <NutritionBadge foodName={foodName} category={foodCategory} mode="parent" />
        </>
      ) : (
        <div className="flex items-center justify-center h-full text-gray-400 text-xs pt-4">+ drag food</div>
      )}
    </div>
  )
}

function ClinicianMealSlot({ slot, foodName, foodCategory, latestLog, isWeekend }) {
  const filled = !!slot.assigned_food_id
  return (
    <div
      aria-label={filled ? `${DAY_LABELS_FULL[slot.day]} ${slot.meal_type}, ${foodName}` : `${DAY_LABELS_FULL[slot.day]} ${slot.meal_type}, empty`}
      className={`${SLOT_BASE} cursor-default
        ${isWeekend ? 'bg-blue-50/30' : 'bg-white'}
        ${filled ? 'border-gray-200' : 'border-dashed border-gray-200'}
      `}
    >
      {filled ? (
        <>
          <span className="text-sm text-gray-900 leading-tight break-words pr-4 block">{foodName}</span>
          <NutritionBadge foodName={foodName} category={foodCategory} mode="clinician" />
        </>
      ) : (
        <div className="flex items-center justify-center h-full text-gray-300 text-xs pt-4">—</div>
      )}
      {filled && <StatusBadge log={latestLog} />}
    </div>
  )
}

export default function WeeklyGrid({ mealSlots, foodItems, mode = 'parent', onSlotClick, latestLogBySlot = {}, onDayClick }) {
  const weekDates = getWeekDates()

  function getSlot(day, mealType) {
    return mealSlots.find(s => s.day === day && s.meal_type === mealType)
      || { id: null, day, meal_type: mealType, assigned_food_id: null }
  }
  function getFood(foodId) {
    if (!foodId) return { name: '', category: 'familiar' }
    const f = foodItems.find(f => f.id === foodId)
    return { name: f?.name || '(unknown)', category: f?.category || 'familiar' }
  }

  return (
    <div className="flex-1 overflow-auto p-4">
      <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
        <div className="min-w-[720px]">
          {/* Sticky day header with dates */}
          <div className="grid grid-cols-[100px_repeat(7,1fr)] gap-2 mb-2 sticky top-0 bg-white z-10 pb-2">
            <div />
            {DAYS.map((day, i) => {
              const d = weekDates[i]
              const dateStr = `${MONTHS[d.getMonth()]} ${d.getDate()}`
              const clickable = mode === 'clinician' && !!onDayClick
              return (
                <div
                  key={day.key}
                  onClick={clickable ? () => onDayClick(day.key) : undefined}
                  className={`text-center py-2 rounded ${day.isWeekend ? 'bg-blue-50 text-blue-900' : 'text-gray-600'} ${clickable ? 'cursor-pointer hover:bg-indigo-50 hover:text-indigo-800 transition-colors' : ''}`}
                  title={clickable ? `View ${day.label} nutrition` : undefined}
                >
                  <div className="text-xs font-semibold uppercase tracking-wide">{day.label}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{dateStr}</div>
                  {clickable && <div className="text-[9px] text-indigo-400 mt-0.5">tap for nutrition</div>}
                </div>
              )
            })}
          </div>

          {/* Meal rows */}
          {MEAL_TYPES.map(meal => (
            <div key={meal.key} className="grid grid-cols-[100px_repeat(7,1fr)] gap-2 mb-2">
              <div className="flex items-center text-sm font-medium text-gray-700">
                {meal.label}
              </div>
              {DAYS.map(day => {
                const slot = getSlot(day.key, meal.key)
                const { name: foodName, category: foodCategory } = getFood(slot.assigned_food_id)
                return mode === 'clinician' ? (
                  <ClinicianMealSlot
                    key={`${day.key}-${meal.key}`}
                    slot={slot}
                    foodName={foodName}
                    foodCategory={foodCategory}
                    latestLog={slot.id ? latestLogBySlot[slot.id] : null}
                    isWeekend={day.isWeekend}
                  />
                ) : (
                  <ParentMealSlot
                    key={slot.id || `${day.key}-${meal.key}`}
                    slot={slot}
                    foodName={foodName}
                    foodCategory={foodCategory}
                    onSlotClick={onSlotClick}
                    isWeekend={day.isWeekend}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
