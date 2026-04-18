import { useDroppable } from '@dnd-kit/core'

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack']

const DAY_LABELS = {
  mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu',
  fri: 'Fri', sat: 'Sat', sun: 'Sun',
}

const DAY_LABELS_FULL = {
  mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday',
  fri: 'Friday', sat: 'Saturday', sun: 'Sunday',
}

function MealSlotCell({ slot, foodName, onSlotClick }) {
  const { setNodeRef, isOver } = useDroppable({ id: slot.id, data: { slot } })
  const filled = !!slot.assigned_food_id

  function handleKeyDown(e) {
    if (filled && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault()
      onSlotClick(slot)
    }
  }

  const ariaLabel = filled
    ? `${DAY_LABELS_FULL[slot.day]} ${slot.meal_type}, ${foodName}. Click to log meal.`
    : `${DAY_LABELS_FULL[slot.day]} ${slot.meal_type}, empty. Drag a food here.`

  return (
    <div
      ref={setNodeRef}
      onClick={() => filled && onSlotClick(slot)}
      onKeyDown={handleKeyDown}
      role={filled ? 'button' : undefined}
      tabIndex={filled ? 0 : undefined}
      aria-label={ariaLabel}
      className={`
        border rounded-lg p-2 min-h-[72px] transition-colors text-xs
        ${filled ? 'cursor-pointer hover:bg-gray-50' : 'cursor-default'}
        ${isOver ? 'bg-blue-100 border-blue-400 border-2' : 'bg-white border-gray-200'}
        ${!filled ? 'border-dashed' : ''}
      `}
    >
      {filled ? (
        <span className="text-gray-700 font-medium leading-snug">{foodName}</span>
      ) : (
        <span className="text-gray-300 text-center block mt-2">+</span>
      )}
    </div>
  )
}

export default function WeeklyGrid({ mealSlots, foodItems, onSlotClick }) {
  function getSlot(day, mealType) {
    return mealSlots.find(s => s.day === day && s.meal_type === mealType) || null
  }

  function getFoodName(foodId) {
    if (!foodId) return ''
    return foodItems.find(f => f.id === foodId)?.name || '(unknown)'
  }

  return (
    <div className="flex-1 overflow-auto p-4">
      <div className="grid grid-cols-8 gap-1 min-w-[640px]">
        {/* Header row */}
        <div className="text-xs font-semibold text-gray-400 uppercase pt-2" />
        {DAYS.map(day => (
          <div key={day} className="text-xs font-semibold text-gray-600 text-center py-2">
            {DAY_LABELS[day]}
          </div>
        ))}

        {/* Meal rows */}
        {MEAL_TYPES.map(mealType => (
          <>
            <div key={mealType + '-label'} className="text-xs font-semibold text-gray-500 capitalize flex items-center pr-1">
              {mealType}
            </div>
            {DAYS.map(day => {
              const slot = getSlot(day, mealType)
              if (!slot) return <div key={day + mealType} className="border border-dashed border-gray-100 rounded-lg min-h-[72px]" />
              return (
                <MealSlotCell
                  key={slot.id}
                  slot={slot}
                  foodName={getFoodName(slot.assigned_food_id)}
                  onSlotClick={onSlotClick}
                />
              )
            })}
          </>
        ))}
      </div>
    </div>
  )
}
