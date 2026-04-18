import { useState, useEffect } from 'react'
import { DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { supabase } from '../lib/supabase'
import { useToast } from '../hooks/useToast'
import FoodSidebar from '../components/FoodSidebar'
import WeeklyGrid from '../components/WeeklyGrid'
import MealLogModal from '../components/MealLogModal'

const FAMILY_ID = import.meta.env.VITE_FAMILY_ID

export default function ParentView() {
  const [mealSlots, setMealSlots] = useState([])
  const [foodItems, setFoodItems] = useState([])
  const [mealLogs, setMealLogs] = useState([])
  const [loggingSlot, setLoggingSlot] = useState(null)
  const { showToast } = useToast()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  useEffect(() => {
    supabase.from('meal_slots').select('*').eq('family_id', FAMILY_ID)
      .then(({ data }) => { if (data) setMealSlots(data) })

    supabase.from('food_items').select('*').eq('family_id', FAMILY_ID)
      .then(({ data }) => { if (data) setFoodItems(data) })

    supabase.from('meal_logs').select('*')
      .then(({ data }) => { if (data) setMealLogs(data) })
  }, [])

  async function handleDragEnd(event) {
    const { active, over } = event
    if (!over) return

    const food = active.data.current?.food
    const slot = over.data.current?.slot
    if (!food || !slot) return

    const optimisticSlots = mealSlots.map(s =>
      s.id === slot.id ? { ...s, assigned_food_id: food.id } : s
    )
    setMealSlots(optimisticSlots)

    const { data, error } = await supabase
      .from('meal_slots')
      .update({ assigned_food_id: food.id })
      .eq('id', slot.id)
      .select()
      .single()

    if (error) {
      setMealSlots(mealSlots)
      showToast('Could not save that drop. Please try again.', 'error')
    } else if (data) {
      setMealSlots(s => s.map(x => x.id === data.id ? data : x))
    }
  }

  function handleSlotClick(slot) {
    setLoggingSlot(slot)
  }

  function getFoodName(foodId) {
    if (!foodId) return ''
    return foodItems.find(f => f.id === foodId)?.name || '(unknown food)'
  }

  async function insertMealLog({ slotId, status, note }) {
    if (!slotId) throw new Error('Cannot log meal: slot has no id yet')
    if (!['okay', 'difficult', 'refused'].includes(status)) {
      throw new Error(`Invalid status: ${status}`)
    }

    const { data, error } = await supabase
      .from('meal_logs')
      .insert({ meal_slot_id: slotId, status, note })
      .select()
      .single()

    if (error) {
      showToast('Could not save meal log. Please try again.', 'error')
      throw error
    }

    setMealLogs(current => [...current, data])
    showToast('Meal logged!', 'success')
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <FoodSidebar />
        <WeeklyGrid
          mealSlots={mealSlots}
          foodItems={foodItems}
          onSlotClick={handleSlotClick}
        />
      </DndContext>

      <MealLogModal
        isOpen={loggingSlot !== null}
        onClose={() => setLoggingSlot(null)}
        slot={loggingSlot}
        foodName={getFoodName(loggingSlot?.assigned_food_id)}
        onSubmit={insertMealLog}
      />
    </div>
  )
}
