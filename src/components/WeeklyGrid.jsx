import { useDroppable } from '@dnd-kit/core'

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack']

const DAY_LABELS = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' }
const DAY_LABELS_FULL = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' }

const SLOT_BASE_CLASSES = 'border rounded-lg p-2 min-h-[80px] transition-colors relative text-xs'

const STATUS_DOT = {
  okay:      'bg-green-500',
  difficult: 'bg-yellow-500',
  refused:   'bg-red-500',
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

function ParentMealSlot({ slot, foodName, onSlotClick }) {
  const { setNodeRef, isOver } = useDroppable({ id: slot.id || `empty-${slot.day}-${slot.meal_type}`, data: { slot } })
  const filled = !!slot.assigned_food_id

  function handleKeyDown(e) {
    if (filled && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault()
      onSlotClick(slot)
    }
  }

  return (
    <div
      ref={setNodeRef}
      onClick={() => filled && onSlotClick(slot)}
      onKeyDown={handleKeyDown}
      role={filled ? 'button' : undefined}
      tabIndex={filled ? 0 : undefined}
      aria-label={
        filled
          ? `${DAY_LABELS_FULL[slot.day]} ${slot.meal_type}, ${foodName}. Click to log meal.`
          : `${DAY_LABELS_FULL[slot.day]} ${slot.meal_type}, empty. Drag a food here.`
      }
      className={`${SLOT_BASE_CLASSES}
        ${filled ? 'cursor-pointer hover:bg-gray-50' : 'cursor-default'}
        ${isOver ? 'bg-blue-100 border-blue-400 border-2' : 'bg-white border-gray-200'}
        ${!filled ? 'border-dashed' : ''}
      `}
    >
      {filled
        ? <span className="text-gray-700 font-medium leading-snug">{foodName}</span>
        : <span className="text-gray-300 text-center block mt-3">+</span>
      }
    </div>
  )
}

function ClinicianMealSlot({ slot, foodName, latestLog }) {
  const filled = !!slot.assigned_food_id
  return (
    <div
      aria-label={
        filled
          ? `${DAY_LABELS_FULL[slot.day]} ${slot.meal_type}, ${foodName}`
          : `${DAY_LABELS_FULL[slot.day]} ${slot.meal_type}, empty`
      }
      className={`${SLOT_BASE_CLASSES} cursor-default bg-white
        ${filled ? 'border-gray-200' : 'border-dashed border-gray-200'}
      `}
    >
      {filled && <span className="text-gray-700 font-medium leading-snug pr-4">{foodName}</span>}
      {!filled && <span className="text-gray-300 text-center block mt-3">—</span>}
      {filled && <StatusBadge log={latestLog} />}
    </div>
  )
}

export default function WeeklyGrid({ mealSlots, foodItems, mode = 'parent', onSlotClick, latestLogBySlot = {} }) {
  function getSlot(day, mealType) {
    return mealSlots.find(s => s.day === day && s.meal_type === mealType) || { id: null, day, meal_type: mealType, assigned_food_id: null }
  }

  function getFoodName(foodId) {
    if (!foodId) return ''
    return foodItems.find(f => f.id === foodId)?.name || '(unknown)'
  }

  return (
    <div className="flex-1 overflow-auto p-4">
      <div className="grid grid-cols-8 gap-1 min-w-[640px]">
        <div className="text-xs font-semibold text-gray-400 uppercase pt-2" />
        {DAYS.map(day => (
          <div key={day} className="text-xs font-semibold text-gray-600 text-center py-2">
            {DAY_LABELS[day]}
          </div>
        ))}

        {MEAL_TYPES.map(mealType => (
          <React.Fragment key={mealType}>
            <div className="text-xs font-semibold text-gray-500 capitalize flex items-center pr-1">
              {mealType}
            </div>
            {DAYS.map(day => {
              const slot = getSlot(day, mealType)
              const foodName = getFoodName(slot.assigned_food_id)
              if (mode === 'clinician') {
                return (
                  <ClinicianMealSlot
                    key={`${day}-${mealType}`}
                    slot={slot}
                    foodName={foodName}
                    latestLog={slot.id ? latestLogBySlot[slot.id] : null}
                  />
                )
              }
              return (
                <ParentMealSlot
                  key={slot.id || `${day}-${mealType}`}
                  slot={slot}
                  foodName={foodName}
                  onSlotClick={onSlotClick}
                />
              )
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}
