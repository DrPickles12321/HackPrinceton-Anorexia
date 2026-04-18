import { useState, useEffect } from 'react'
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { supabase } from '../lib/supabase'
import { DEMO_FAMILY_ID } from '../lib/constants'
import { useToast } from '../hooks/useToast'
import { useRealtime } from '../hooks/useRealtime'
import { useRealtimeStatus } from '../contexts/RealtimeContext'
import FoodSidebar from '../components/FoodSidebar'
import WeeklyGrid from '../components/WeeklyGrid'
import MealLogModal from '../components/MealLogModal'
import FoodCardPreview from '../components/FoodCardPreview'
import NotesPanel from '../components/NotesPanel'
import WeeklyGoals from '../components/WeeklyGoals'

export default function ParentView() {
  const [mealSlots, setMealSlots] = useState([])
  const [foodItems, setFoodItems] = useState([])
  const [mealLogs, setMealLogs] = useState([])
  const [notes, setNotes] = useState([])
  const [loggingSlot, setLoggingSlot] = useState(null)
  const [activeDrag, setActiveDrag] = useState(null)
  const { showToast } = useToast()
  const { setStatus } = useRealtimeStatus()

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  useEffect(() => {
    document.title = 'My Week · Plate Together'
    supabase.from('meal_slots').select('*').eq('family_id', DEMO_FAMILY_ID)
      .then(({ data }) => { if (data) setMealSlots(data) })
    supabase.from('food_items').select('*').eq('family_id', DEMO_FAMILY_ID)
      .then(({ data }) => { if (data) setFoodItems(data) })
    supabase.from('meal_logs').select('*')
      .then(({ data }) => { if (data) setMealLogs(data) })
    supabase.from('clinician_notes').select('*').eq('family_id', DEMO_FAMILY_ID)
      .order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setNotes(data) })
    return () => setStatus('disconnected')
  }, [setStatus])

  useRealtime({
    table: 'meal_slots',
    familyId: DEMO_FAMILY_ID,
    onInsert: row => setMealSlots(c => c.some(s => s.id === row.id) ? c : [...c, row]),
    onUpdate: row => setMealSlots(c => {
      const existing = c.find(s => s.id === row.id)
      if (existing && existing.assigned_food_id === row.assigned_food_id) return c
      return c.map(s => s.id === row.id ? row : s)
    }),
    onDelete: row => setMealSlots(c => c.filter(s => s.id !== row.id)),
    onStatusChange: setStatus,
  })

  useRealtime({
    table: 'clinician_notes',
    familyId: DEMO_FAMILY_ID,
    onInsert: row => setNotes(c => [row, ...c]),
    onUpdate: row => setNotes(c => c.map(n => n.id === row.id ? row : n)),
    onDelete: row => setNotes(c => c.filter(n => n.id !== row.id)),
  })

  useRealtime({
    table: 'food_items',
    familyId: DEMO_FAMILY_ID,
    onInsert: row => setFoodItems(c => c.some(f => f.id === row.id) ? c : [...c, row]),
    onUpdate: row => setFoodItems(c => c.map(f => f.id === row.id ? row : f)),
    onDelete: row => {
      setFoodItems(c => c.filter(f => f.id !== row.id))
      setMealSlots(c => c.map(s => s.assigned_food_id === row.id ? { ...s, assigned_food_id: null } : s))
    },
  })

  async function handleDragEnd(event) {
    const { active, over } = event
    setActiveDrag(null)
    if (!over) return
    const food = active.data.current?.food
    const slot = over.data.current?.slot
    if (!food || !slot) return

    const prev = mealSlots
    setMealSlots(c => c.map(s => s.id === slot.id ? { ...s, assigned_food_id: food.id } : s))

    const { data, error } = await supabase
      .from('meal_slots').update({ assigned_food_id: food.id }).eq('id', slot.id).select().single()

    if (error) {
      setMealSlots(prev)
      showToast('Could not save that drop. Please try again.', 'error')
    } else if (data) {
      setMealSlots(c => c.map(s => s.id === data.id ? data : s))
    }
  }

  async function insertMealLog({ slotId, status, note }) {
    if (!slotId) throw new Error('Cannot log meal: slot has no id yet')
    if (!['okay', 'difficult', 'refused'].includes(status)) throw new Error(`Invalid status: ${status}`)

    const { data, error } = await supabase
      .from('meal_logs').insert({ meal_slot_id: slotId, status, note }).select().single()

    if (error) {
      showToast('Could not save meal log. Please try again.', 'error')
      throw error
    }
    setMealLogs(c => [...c, data])
    showToast('Meal logged!', 'success')
  }

  async function handleMarkRead(noteId) {
    setNotes(c => c.map(n => n.id === noteId ? { ...n, is_read: true } : n))
    await supabase.from('clinician_notes').update({ is_read: true }).eq('id', noteId)
  }

  async function handleDeleteNote(noteId) {
    setNotes(c => c.filter(n => n.id !== noteId))
    await supabase.from('clinician_notes').delete().eq('id', noteId)
  }

  function getFoodById(foodId) {
    return foodItems.find(f => f.id === foodId) || null
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6">
      <DndContext
        sensors={sensors}
        onDragStart={e => {
          const food = e.active.data.current?.food
          if (food) setActiveDrag(food)
        }}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveDrag(null)}
      >
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 lg:gap-6">
          <aside className="lg:sticky lg:top-[72px] lg:self-start lg:max-h-[calc(100vh-88px)] lg:overflow-y-auto">
            <FoodSidebar />
          </aside>
          <main>
            <WeeklyGrid
              mealSlots={mealSlots}
              foodItems={foodItems}
              onSlotClick={setLoggingSlot}
            />
          </main>
        </div>

        <DragOverlay dropAnimation={{ duration: 200, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
          {activeDrag ? (
            <FoodCardPreview name={activeDrag.name} category={activeDrag.category} floating />
          ) : null}
        </DragOverlay>
      </DndContext>

      <MealLogModal
        isOpen={loggingSlot !== null}
        onClose={() => setLoggingSlot(null)}
        slot={loggingSlot}
        foodName={getFoodById(loggingSlot?.assigned_food_id)?.name || ''}
        foodCategory={getFoodById(loggingSlot?.assigned_food_id)?.category || 'familiar'}
        onSubmit={insertMealLog}
      />

      <div className="mt-8 space-y-6">
        <WeeklyGoals mealSlots={mealSlots} foodItems={foodItems} mode="parent" />
        <NotesPanel
          notes={notes}
          mealSlots={mealSlots}
          foodItems={foodItems}
          mode="parent"
          onSend={() => {}}
          onMarkRead={handleMarkRead}
          onDelete={handleDeleteNote}
        />
      </div>

      <footer className="text-xs text-gray-500 text-center py-6 mt-8 border-t">
        This tool supports meal planning between families and their care team. It is not a substitute for medical advice, diagnosis, or treatment. If you're in crisis, contact your treatment team or a helpline in your region.
      </footer>
    </div>
  )
}
