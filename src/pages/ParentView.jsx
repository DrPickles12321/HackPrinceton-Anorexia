import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { DEMO_FAMILY_ID } from '../lib/constants'
import { useToast } from '../hooks/useToast'
import { useRealtime } from '../hooks/useRealtime'
import { useRealtimeStatus } from '../contexts/RealtimeContext'

export default function ParentView() {
  const [mealSlots, setMealSlots] = useState([])
  const [foodItems, setFoodItems] = useState([])
  const [mealLogs, setMealLogs] = useState([])
  const [clinicianNotes, setClinicianNotes] = useState([])
  const [parentNotes, setParentNotes] = useState(() => {
    try { return Object.values(JSON.parse(localStorage.getItem('parentNotesByDate') || '{}')) }
    catch { return [] }
  })
  const [clinicianNotesRead, setClinicianNotesRead] = useState(() => {
    try { return JSON.parse(localStorage.getItem('clinicianNotesReadByParent') || '{}') }
    catch { return {} }
  })
  const [savedClinicianNotes, setSavedClinicianNotes] = useState(() => {
    try { return JSON.parse(localStorage.getItem('savedClinicianNotes') || '[]') }
    catch { return [] }
  })
  const [mealStatuses, setMealStatuses] = useState(() => {
    try { return JSON.parse(localStorage.getItem('parentMealStatusesByDate') || '{}') }
    catch { return {} }
  })
  const { showToast } = useToast()
  const { setStatus } = useRealtimeStatus()

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
      .then(({ data }) => { if (data) setClinicianNotes(data) })
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
    onInsert: row => setClinicianNotes(c => [row, ...c]),
    onUpdate: row => setClinicianNotes(c => c.map(n => n.id === row.id ? row : n)),
    onDelete: row => setClinicianNotes(c => c.filter(n => n.id !== row.id)),
  })

  function setMealStatus(date, mealType, status) {
    setMealStatuses(prev => {
      const day = { ...(prev[date] || {}) }
      if (day[mealType] === status) return prev
      day[mealType] = status
      const next = { ...prev, [date]: day }
      localStorage.setItem('parentMealStatusesByDate', JSON.stringify(next))
      return next
    })
  }

  function markClinicianNoteRead(note) {
    const stored = JSON.parse(localStorage.getItem('clinicianNotesReadByParent') || '{}')
    const readAt = new Date().toISOString()
    const noteDate = note.created_at?.slice(0, 10)
    const next = {
      ...stored,
      [note.id]: { readAt, noteCreatedAt: note.created_at },
      ['date:' + noteDate]: { noteId: note.id, readAt, noteCreatedAt: note.created_at },
    }
    localStorage.setItem('clinicianNotesReadByParent', JSON.stringify(next))
    setClinicianNotesRead(next)
  }

  function saveClinicianNote(note) {
    setSavedClinicianNotes(prev => {
      if (prev.some(n => n.id === note.id)) return prev
      const next = [...prev, { id: note.id, body: note.body, created_at: note.created_at, savedAt: new Date().toISOString() }]
      localStorage.setItem('savedClinicianNotes', JSON.stringify(next))
      return next
    })
  }

  function unsaveClinicianNote(noteId) {
    setSavedClinicianNotes(prev => {
      const next = prev.filter(n => n.id !== noteId)
      localStorage.setItem('savedClinicianNotes', JSON.stringify(next))
      return next
    })
  }

  function saveParentNote({ date, body, existingNoteId }) {
    const stored = JSON.parse(localStorage.getItem('parentNotesByDate') || '{}')
    const note = existingNoteId
      ? { ...stored[date], body, read_at: null }
      : { id: crypto.randomUUID(), date, body, read_at: null, created_at: new Date().toISOString() }
    stored[date] = note
    localStorage.setItem('parentNotesByDate', JSON.stringify(stored))
    setParentNotes(Object.values(stored))
  }

  async function updateMealSlot(slotId, assignedFoodId) {
    if (!slotId) throw new Error('Cannot update meal slot: slot id is required')

    const prevSlots = mealSlots
    setMealSlots(c => c.map(s => s.id === slotId ? { ...s, assigned_food_id: assignedFoodId } : s))

    const { data, error } = await supabase
      .from('meal_slots').update({ assigned_food_id: assignedFoodId }).eq('id', slotId).select().single()

    if (error) {
      setMealSlots(prevSlots)
      showToast('Could not save your meal change. Please try again.', 'error')
      throw error
    }
    if (data) {
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

  return (
    <div style={{ width: '100%', padding: '16px 24px' }}>
      <Outlet context={{ mealSlots, foodItems, mealLogs, clinicianNotes, parentNotes, clinicianNotesRead, mealStatuses, savedClinicianNotes, updateMealSlot, insertMealLog, saveParentNote, markClinicianNoteRead, saveClinicianNote, unsaveClinicianNote, setMealStatus }} />
    </div>
  )
}
