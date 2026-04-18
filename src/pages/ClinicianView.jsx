import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { DEMO_FAMILY_ID } from '../lib/constants'
import { useRealtime } from '../hooks/useRealtime'
import { useRealtimeStatus } from '../contexts/RealtimeContext'
import { useToast } from '../hooks/useToast'
import WeeklyGrid from '../components/WeeklyGrid'
import WeeklyInsights from '../components/WeeklyInsights'
import NotesPanel from '../components/NotesPanel'
import DailyNutritionSummary from '../components/nutrition/DailyNutritionSummary'
import WeeklyGoals from '../components/WeeklyGoals'

export default function ClinicianView() {
  const [mealSlots, setMealSlots] = useState([])
  const [foodItems, setFoodItems] = useState([])
  const [mealLogs, setMealLogs] = useState([])
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedDay, setSelectedDay] = useState(null)
  const { setStatus } = useRealtimeStatus()
  const { showToast } = useToast()

  useEffect(() => {
    document.title = 'Dashboard · Plate Together'
    loadData()
    return () => setStatus('disconnected')
  }, [setStatus])

  async function loadData() {
    setLoading(true)
    setError(null)
    try {
      const [slotsRes, foodsRes, logsRes, notesRes] = await Promise.all([
        supabase.from('meal_slots').select('*').eq('family_id', DEMO_FAMILY_ID),
        supabase.from('food_items').select('*').eq('family_id', DEMO_FAMILY_ID),
        supabase.from('meal_logs')
          .select('*, meal_slots!inner(family_id)')
          .eq('meal_slots.family_id', DEMO_FAMILY_ID)
          .order('logged_at', { ascending: false }),
        supabase.from('clinician_notes').select('*').eq('family_id', DEMO_FAMILY_ID)
          .order('created_at', { ascending: false }),
      ])
      if (slotsRes.error) throw slotsRes.error
      if (foodsRes.error) throw foodsRes.error
      if (logsRes.error) throw logsRes.error
      if (notesRes.error) throw notesRes.error
      setMealSlots(slotsRes.data || [])
      setFoodItems(foodsRes.data || [])
      setMealLogs(logsRes.data || [])
      setNotes(notesRes.data || [])
    } catch (err) {
      console.error('Failed to load clinician data:', err)
      setError('Could not load the board. Please refresh.')
    } finally {
      setLoading(false)
    }
  }

  useRealtime({
    table: 'meal_slots',
    familyId: DEMO_FAMILY_ID,
    onInsert: row => setMealSlots(c => c.some(s => s.id === row.id) ? c.map(s => s.id === row.id ? row : s) : [...c, row]),
    onUpdate: row => setMealSlots(c => c.map(s => s.id === row.id ? row : s)),
    onDelete: row => setMealSlots(c => c.filter(s => s.id !== row.id)),
    onStatusChange: setStatus,
  })

  useRealtime({
    table: 'meal_logs',
    familyId: DEMO_FAMILY_ID,
    filterOnFamilyId: false,
    onInsert: row => {
      setMealLogs(c => {
        if (c.some(l => l.id === row.id)) return c
        return [row, ...c]
      })
    },
    onUpdate: row => setMealLogs(c => c.map(l => l.id === row.id ? row : l)),
    onDelete: row => setMealLogs(c => c.filter(l => l.id !== row.id)),
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

  useRealtime({
    table: 'clinician_notes',
    familyId: DEMO_FAMILY_ID,
    onInsert: row => setNotes(c => [row, ...c]),
    onUpdate: row => setNotes(c => c.map(n => n.id === row.id ? row : n)),
    onDelete: row => setNotes(c => c.filter(n => n.id !== row.id)),
  })

  async function handleDeleteNote(noteId) {
    setNotes(c => c.filter(n => n.id !== noteId))
    await supabase.from('clinician_notes').delete().eq('id', noteId)
  }

  async function handleSendNote({ body, slotId }) {
    const { data, error } = await supabase
      .from('clinician_notes')
      .insert({ family_id: DEMO_FAMILY_ID, body, slot_id: slotId })
      .select().single()
    if (error) {
      showToast('Could not send note.', 'error')
      throw error
    }
    setNotes(c => [data, ...c])
    showToast('Note sent!', 'success')
  }

  const latestLogBySlot = useMemo(() => {
    const map = {}
    for (const log of mealLogs) {
      if (!map[log.meal_slot_id]) map[log.meal_slot_id] = { status: log.status, note: log.note, logged_at: log.logged_at }
    }
    return map
  }, [mealLogs])

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Clinician Dashboard</h1>
        <p className="text-sm text-gray-600">Weekly meal plan and logs for this family</p>
      </header>

      {loading && <div className="text-center py-12 text-gray-500">Loading board...</div>}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4">
          {error}
          <button onClick={loadData} className="ml-3 underline font-medium">Try again</button>
        </div>
      )}

      {!loading && !error && (
        <>
          <WeeklyGrid
            mealSlots={mealSlots}
            foodItems={foodItems}
            mode="clinician"
            latestLogBySlot={latestLogBySlot}
            onDayClick={day => setSelectedDay(day)}
          />
          <WeeklyInsights mealLogs={mealLogs} foodItems={foodItems} mealSlots={mealSlots} />
          <WeeklyGoals mealSlots={mealSlots} foodItems={foodItems} mode="clinician" />
          <NotesPanel
            notes={notes}
            mealSlots={mealSlots}
            foodItems={foodItems}
            mode="clinician"
            onSend={handleSendNote}
            onMarkRead={() => {}}
            onDelete={handleDeleteNote}
          />
        </>
      )}

      {selectedDay && (
        <DailyNutritionSummary
          day={selectedDay}
          mealSlots={mealSlots}
          foodItems={foodItems}
          onClose={() => setSelectedDay(null)}
        />
      )}
    </div>
  )
}
