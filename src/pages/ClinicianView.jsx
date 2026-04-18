import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { DEMO_FAMILY_ID } from '../lib/constants'
import { useRealtime } from '../hooks/useRealtime'
import { useRealtimeStatus } from '../contexts/RealtimeContext'
import { useToast } from '../hooks/useToast'
import { useFirebaseData } from '../contexts/FirebaseDataContext'

function ClinicianSupplementEditor({ prescribedSupplements, onSave }) {
  const [input, setInput] = useState('')
  const [saved, setSaved] = useState(false)

  function handleAdd() {
    const trimmed = input.trim()
    if (!trimmed || prescribedSupplements.includes(trimmed)) return
    onSave([...prescribedSupplements, trimmed])
    setInput('')
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  function handleRemove(name) {
    onSave(prescribedSupplements.filter(s => s !== name))
  }

  return (
    <div style={{
      background: 'white', borderRadius: 16,
      border: '1.5px solid #e5e7eb', padding: '20px 24px', marginTop: 16,
    }}>
      <h2 style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 4 }}>
        Prescribed Supplements
      </h2>
      <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 16 }}>
        These will appear in the patient's daily supplement checklist.
      </p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          placeholder="e.g. Calcium + D3"
          style={{
            flex: 1, padding: '8px 12px', borderRadius: 10,
            border: '1.5px solid #e5e7eb', fontSize: 13,
            color: '#111827', fontFamily: "'Outfit', sans-serif", outline: 'none',
          }}
          onFocus={e => e.target.style.borderColor = '#E8735A'}
          onBlur={e => e.target.style.borderColor = '#e5e7eb'}
        />
        <button
          onClick={handleAdd}
          disabled={!input.trim()}
          style={{
            padding: '8px 18px', borderRadius: 10, border: 'none',
            background: input.trim() ? '#E8735A' : 'rgba(232,115,90,0.3)',
            color: 'white', fontSize: 13, fontWeight: 600,
            fontFamily: "'Outfit', sans-serif",
            cursor: input.trim() ? 'pointer' : 'not-allowed',
          }}
        >{saved ? 'Added ✓' : 'Add'}</button>
      </div>
      {prescribedSupplements.length === 0 ? (
        <p style={{ fontSize: 12, color: '#9ca3af', fontStyle: 'italic' }}>No supplements prescribed yet.</p>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {prescribedSupplements.map(name => (
            <span key={name} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: '#fef3f0', border: '1px solid #f5c4b8',
              borderRadius: 20, padding: '5px 12px',
              fontSize: 13, color: '#E8735A', fontWeight: 500,
              fontFamily: "'Outfit', sans-serif",
            }}>
              {name}
              <button
                onClick={() => handleRemove(name)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#E8735A', fontSize: 16, lineHeight: 1,
                  padding: 0, display: 'flex', alignItems: 'center',
                  fontFamily: 'inherit', opacity: 0.6,
                }}
              >×</button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
import WeeklyGrid from '../components/WeeklyGrid'
import WeeklyInsights from '../components/WeeklyInsights'
import NotesPanel from '../components/NotesPanel'
import DailyNutritionSummary from '../components/nutrition/DailyNutritionSummary'
import WeeklyGoals from '../components/WeeklyGoals'
import NutritionalTargets from '../components/NutritionalTargets'

export default function ClinicianView() {
  const [mealSlots, setMealSlots] = useState([])
  const [foodItems, setFoodItems] = useState([])
  const [mealLogs, setMealLogs] = useState([])
  const [notes, setNotes] = useState([])

  const {
    parentNotesArray: parentNotes,
    allMealItems: parentMealItems,
    mealStatuses: parentMealStatuses,
    clinicianNotesRead,
    markParentNoteReadById,
    patients,
    viewingPatientUid,
    setViewingPatientUid,
    addPatientByCode,
    prescribedSupplements,
    savePrescribedSupplements,
  } = useFirebaseData()

  const [addCodeInput, setAddCodeInput]   = useState('')
  const [addCodeError, setAddCodeError]   = useState('')
  const [addCodeLoading, setAddCodeLoading] = useState(false)

  async function handleAddPatient(e) {
    e.preventDefault()
    setAddCodeError('')
    setAddCodeLoading(true)
    const result = await addPatientByCode(addCodeInput)
    setAddCodeLoading(false)
    if (result.error) {
      setAddCodeError(result.error)
    } else {
      setAddCodeInput('')
    }
  }

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedDay, setSelectedDay] = useState(null)
  const [apptDateTime, setApptDateTime] = useState('')
  const [apptSaving, setApptSaving] = useState(false)
  const [apptSaved, setApptSaved] = useState(false)
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

  function handleMarkNoteRead(noteId) {
    markParentNoteReadById(noteId)
  }

  async function handleDeleteNote(noteId) {
    setNotes(c => c.filter(n => n.id !== noteId))
    await supabase.from('clinician_notes').delete().eq('id', noteId)
  }

  async function handleSaveNote({ body, existingNoteId }) {
    if (existingNoteId) {
      const { error } = await supabase
        .from('clinician_notes')
        .update({ body })
        .eq('id', existingNoteId)
      if (error) throw error
      setNotes(c => c.map(n => n.id === existingNoteId ? { ...n, body } : n))
    } else {
      const { data, error } = await supabase
        .from('clinician_notes')
        .insert({ family_id: DEMO_FAMILY_ID, body, slot_id: null })
        .select().single()
      if (error) throw error
      setNotes(c => [data, ...c])
    }
  }

  async function handleScheduleAppointment(e) {
    e.preventDefault()
    if (!apptDateTime || apptSaving) return
    setApptSaving(true)
    try {
      const { error } = await supabase.from('appointments').insert({
        scheduled_at: new Date(apptDateTime).toISOString(),
        clinician_name: 'Clinician',
        patient_name: 'Patient',
      })
      if (error) throw error
      setApptSaved(true)
      setApptDateTime('')
      setTimeout(() => setApptSaved(false), 3000)
    } catch (err) {
      console.error('Failed to schedule appointment:', err)
    } finally {
      setApptSaving(false)
    }
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

      {/* ── Patient selector ─────────────────────────────────────────────── */}
      <div style={{
        background: 'white', borderRadius: 16, border: '1.5px solid #e5e7eb',
        padding: '16px 20px', display: 'flex', alignItems: 'flex-start',
        gap: 20, flexWrap: 'wrap',
      }}>
        {/* Dropdown */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 220 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Viewing patient
          </label>
          <select
            value={viewingPatientUid || ''}
            onChange={e => setViewingPatientUid(e.target.value || null)}
            style={{
              padding: '7px 12px', borderRadius: 10, border: '1.5px solid #e5e7eb',
              fontSize: 13, color: '#111827', background: 'white',
              fontFamily: "'Lato', sans-serif", cursor: 'pointer', outline: 'none',
            }}
          >
            <option value="">— Select a patient —</option>
            {patients.map(p => (
              <option key={p.uid} value={p.uid}>{p.email}</option>
            ))}
          </select>
        </div>

        {/* Divider */}
        <div style={{ width: 1, background: '#e5e7eb', alignSelf: 'stretch', margin: '0 4px' }} />

        {/* Add Patient */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Add patient by family code
          </label>
          <form onSubmit={handleAddPatient} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              value={addCodeInput}
              onChange={e => { setAddCodeInput(e.target.value.toUpperCase()); setAddCodeError('') }}
              placeholder="ABC123"
              maxLength={6}
              style={{
                padding: '7px 12px', borderRadius: 10, border: '1.5px solid #e5e7eb',
                fontSize: 13, color: '#111827', fontFamily: "'Lato', sans-serif",
                outline: 'none', width: 110, letterSpacing: '1px', fontWeight: 600,
              }}
              onFocus={e => e.target.style.borderColor = '#E8735A'}
              onBlur={e => e.target.style.borderColor = '#e5e7eb'}
            />
            <button
              type="submit"
              disabled={addCodeLoading || addCodeInput.length < 6}
              style={{
                padding: '7px 16px', borderRadius: 10, border: 'none',
                background: addCodeLoading || addCodeInput.length < 6
                  ? 'rgba(232,115,90,0.4)'
                  : 'linear-gradient(135deg, #E8735A 0%, #C85A8A 100%)',
                color: 'white', fontSize: 13, fontWeight: 600,
                fontFamily: "'Lato', sans-serif",
                cursor: addCodeLoading || addCodeInput.length < 6 ? 'not-allowed' : 'pointer',
              }}
            >
              {addCodeLoading ? '…' : 'Add'}
            </button>
          </form>
          {addCodeError && (
            <span style={{ fontSize: 12, color: '#E8735A', marginTop: 2 }}>{addCodeError}</span>
          )}
        </div>
      </div>

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
          {!viewingPatientUid ? (
            <div style={{
              textAlign: 'center', padding: '64px 24px',
              color: '#9ca3af', fontSize: 14,
              fontFamily: "'Outfit', sans-serif",
            }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>🩺</div>
              <p style={{ fontWeight: 600, color: '#6b7280', fontSize: 16, marginBottom: 8 }}>
                No patient selected
              </p>
              <p style={{ fontSize: 13 }}>
                Select a patient from the dropdown above to view their data.
              </p>
            </div>
          ) : (
          <>
          <WeeklyGrid
            mealSlots={mealSlots}
            foodItems={foodItems}
            mode="clinician"
            latestLogBySlot={latestLogBySlot}
            onDayClick={(day, date) => setSelectedDay({ key: day, date })}
            parentNotes={parentNotes}
            onMarkNoteRead={handleMarkNoteRead}
            parentMealItems={parentMealItems}
          />
          <WeeklyInsights mealLogs={mealLogs} foodItems={foodItems} mealSlots={mealSlots} allMealItems={parentMealItems} mealStatuses={parentMealStatuses} />
          <WeeklyGoals mealSlots={mealSlots} foodItems={foodItems} mode="clinician" allMealItems={parentMealItems} />
          {viewingPatientUid && (
            <ClinicianSupplementEditor
              prescribedSupplements={prescribedSupplements}
              onSave={savePrescribedSupplements}
            />
          )}
          <NutritionalTargets />
          <div style={{
            background: 'white', borderRadius: 16, border: '1.5px solid #e5e7eb',
            padding: '20px 24px', marginTop: 16,
          }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 12 }}>
              Schedule Session
            </h2>
            <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 14 }}>
              The agent will send a prep summary to the iMessage thread 30 minutes before.
            </p>
            <form onSubmit={handleScheduleAppointment} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <input
                type="datetime-local"
                value={apptDateTime}
                onChange={e => setApptDateTime(e.target.value)}
                required
                style={{
                  border: '1.5px solid #d1d5db', borderRadius: 10, padding: '8px 12px',
                  fontSize: 13, color: '#111827', fontFamily: "'Lato', sans-serif",
                  outline: 'none',
                }}
              />
              <button
                type="submit"
                disabled={!apptDateTime || apptSaving}
                style={{
                  padding: '9px 18px', fontSize: 13, fontWeight: 600, borderRadius: 10,
                  border: 'none', background: '#6366f1', color: 'white',
                  cursor: apptDateTime && !apptSaving ? 'pointer' : 'not-allowed',
                  opacity: !apptDateTime || apptSaving ? 0.5 : 1,
                  fontFamily: "'Lato', sans-serif",
                }}
              >
                {apptSaving ? 'Saving…' : 'Schedule'}
              </button>
              {apptSaved && (
                <span style={{ fontSize: 12, color: '#10b981', fontWeight: 600 }}>Scheduled ✓</span>
              )}
            </form>
          </div>
          <NotesPanel
            notes={notes}
            mode="clinician"
            onSave={handleSaveNote}
            notesReadByParent={clinicianNotesRead}
          />
          </>
          )}
        </>
      )}

      {selectedDay && (
        <DailyNutritionSummary
          day={selectedDay.key}
          dateIso={selectedDay.date}
          mealSlots={mealSlots}
          foodItems={foodItems}
          loggedMealItems={parentMealItems[selectedDay.date] || {}}
          onClose={() => setSelectedDay(null)}
        />
      )}
    </div>
  )
}
