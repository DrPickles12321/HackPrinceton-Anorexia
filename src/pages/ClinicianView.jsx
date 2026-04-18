import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { DEMO_FAMILY_ID } from '../lib/constants'
import WeeklyGrid from '../components/WeeklyGrid'
import WeeklyInsights from '../components/WeeklyInsights'

export default function ClinicianView() {
  const [mealSlots, setMealSlots] = useState([])
  const [foodItems, setFoodItems] = useState([])
  const [mealLogs, setMealLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    setError(null)
    try {
      const [slotsRes, foodsRes, logsRes] = await Promise.all([
        supabase.from('meal_slots').select('*').eq('family_id', DEMO_FAMILY_ID),
        supabase.from('food_items').select('*').eq('family_id', DEMO_FAMILY_ID),
        supabase
          .from('meal_logs')
          .select('*, meal_slots!inner(family_id)')
          .eq('meal_slots.family_id', DEMO_FAMILY_ID)
          .order('logged_at', { ascending: false }),
      ])
      if (slotsRes.error) throw slotsRes.error
      if (foodsRes.error) throw foodsRes.error
      if (logsRes.error) throw logsRes.error
      setMealSlots(slotsRes.data || [])
      setFoodItems(foodsRes.data || [])
      setMealLogs(logsRes.data || [])
    } catch (err) {
      console.error('Failed to load clinician data:', err)
      setError('Could not load the board. Please refresh.')
    } finally {
      setLoading(false)
    }
  }

  const latestLogBySlot = useMemo(() => {
    const map = {}
    for (const log of mealLogs) {
      if (!map[log.meal_slot_id]) {
        map[log.meal_slot_id] = { status: log.status, note: log.note, logged_at: log.logged_at }
      }
    }
    return map
  }, [mealLogs])

  return (
    <div className="max-w-7xl mx-auto p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Clinician Dashboard</h1>
        <p className="text-sm text-gray-600">Weekly meal plan and logs for this family</p>
      </header>

      {loading && (
        <div className="text-center py-12 text-gray-500">Loading board...</div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 mb-4">
          {error}
          <button onClick={loadData} className="ml-3 underline font-medium">
            Try again
          </button>
        </div>
      )}

      {!loading && !error && (
        <>
          <WeeklyGrid
            mealSlots={mealSlots}
            foodItems={foodItems}
            mode="clinician"
            latestLogBySlot={latestLogBySlot}
          />
          <WeeklyInsights
            mealLogs={mealLogs}
            foodItems={foodItems}
            mealSlots={mealSlots}
          />
        </>
      )}
    </div>
  )
}
