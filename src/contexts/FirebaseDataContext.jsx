import { createContext, useContext, useEffect, useState } from 'react'
import { ref, onValue, set, update, get } from 'firebase/database'
import { db } from '../firebase'
import { useAuth } from './AuthContext'

const FirebaseDataContext = createContext(null)

const DEFAULT_TARGETS = { protein: 95, carbs: 145, fruitsVeggies: 225 }
const DEFAULT_MEAL_TIMES = { breakfast: '08:00', lunch: '13:00', snack: '15:30', dinner: '19:00' }

function fbToArr(val) {
  if (!val) return []
  if (Array.isArray(val)) return val
  return Object.values(val)
}

function normalizeMealData(val) {
  const result = {}
  for (const [date, meals] of Object.entries(val || {})) {
    result[date] = {}
    for (const [mealType, data] of Object.entries(meals || {})) {
      result[date][mealType] = {
        items:  fbToArr(data?.items),
        status: data?.status || null,
      }
    }
  }
  return result
}

function deriveMealItems(fbMealData) {
  const out = {}
  for (const [date, meals] of Object.entries(fbMealData)) {
    out[date] = {}
    for (const [mealType, data] of Object.entries(meals)) {
      out[date][mealType] = data.items || []
    }
  }
  return out
}

function deriveMealStatuses(fbMealData) {
  const out = {}
  for (const [date, meals] of Object.entries(fbMealData)) {
    out[date] = {}
    for (const [mealType, data] of Object.entries(meals)) {
      if (data.status) out[date][mealType] = data.status
    }
  }
  return out
}

export function FirebaseDataProvider({ children }) {
  const { user } = useAuth()
  const uid = user?.uid || null

  // ── Own user data ──────────────────────────────────────────────────────────
  const [fbMealData, setFbMealData]                   = useState({})
  const [ownNutritionalTargets, setOwnNutritionalTargets] = useState(DEFAULT_TARGETS)
  const [parentNotesByDate, setParentNotesByDate]     = useState({})
  const [mealTimes, setMealTimes]                     = useState(DEFAULT_MEAL_TIMES)
  const [supplementLog, setSupplementLog]             = useState({})
  const [clinicianNotesRead, setClinicianNotesRead]   = useState({})
  const [savedClinicianNotes, setSavedClinicianNotes] = useState([])
  const [familyCode, setFamilyCode]                   = useState(null)

  // ── Clinician patient management ──────────────────────────────────────────
  const [patients, setPatients]                       = useState([])   // [{uid, email}]
  const [viewingPatientUid, setViewingPatientUid]     = useState(null)
  const [patientFbMealData, setPatientFbMealData]     = useState({})
  const [patientNutritionalTargets, setPatientNutritionalTargets] = useState(DEFAULT_TARGETS)

  // ── Subscribe to own data ──────────────────────────────────────────────────
  useEffect(() => {
    if (!uid) {
      setFbMealData({})
      setOwnNutritionalTargets(DEFAULT_TARGETS)
      setParentNotesByDate({})
      setMealTimes(DEFAULT_MEAL_TIMES)
      setSupplementLog({})
      setClinicianNotesRead({})
      setSavedClinicianNotes([])
      setFamilyCode(null)
      setPatients([])
      setViewingPatientUid(null)
      return
    }

    const base = `users/${uid}`
    const unsubs = []

    unsubs.push(onValue(ref(db, `${base}/mealLogs`), snap => {
      setFbMealData(normalizeMealData(snap.val()))
    }))

    unsubs.push(onValue(ref(db, `${base}/nutritionalTargets`), snap => {
      const val = snap.val()
      if (!val) {
        set(ref(db, `${base}/nutritionalTargets`), DEFAULT_TARGETS)
      } else {
        setOwnNutritionalTargets(val.breakfast ? DEFAULT_TARGETS : val)
      }
    }))

    unsubs.push(onValue(ref(db, `${base}/parentNotes`), snap => {
      setParentNotesByDate(snap.val() || {})
    }))

    unsubs.push(onValue(ref(db, `${base}/mealTimes`), snap => {
      setMealTimes(snap.val() || DEFAULT_MEAL_TIMES)
    }))

    unsubs.push(onValue(ref(db, `${base}/supplementLog`), snap => {
      const val = snap.val() || {}
      const normalized = {}
      for (const [date, items] of Object.entries(val)) normalized[date] = fbToArr(items)
      setSupplementLog(normalized)
    }))

    unsubs.push(onValue(ref(db, `${base}/clinicianNotesRead`), snap => {
      setClinicianNotesRead(snap.val() || {})
    }))

    unsubs.push(onValue(ref(db, `${base}/savedClinicianNotes`), snap => {
      const val = snap.val()
      setSavedClinicianNotes(val ? Object.values(val) : [])
    }))

    unsubs.push(onValue(ref(db, `${base}/familyCode`), snap => {
      setFamilyCode(snap.val() || null)
    }))

    unsubs.push(onValue(ref(db, `${base}/patients`), snap => {
      const val = snap.val() || {}
      setPatients(Object.entries(val).map(([pUid, data]) => ({
        uid:   pUid,
        email: typeof data === 'object' ? (data.email || pUid) : pUid,
      })))
    }))

    return () => unsubs.forEach(u => u())
  }, [uid])

  // ── Subscribe to selected patient data (for clinician) ────────────────────
  useEffect(() => {
    if (!viewingPatientUid) {
      setPatientFbMealData({})
      setPatientNutritionalTargets(DEFAULT_TARGETS)
      return
    }
    const unsubs = []
    unsubs.push(onValue(ref(db, `users/${viewingPatientUid}/mealLogs`), snap => {
      setPatientFbMealData(normalizeMealData(snap.val()))
    }))
    unsubs.push(onValue(ref(db, `users/${viewingPatientUid}/nutritionalTargets`), snap => {
      const val = snap.val()
      setPatientNutritionalTargets(val && !val.breakfast ? val : DEFAULT_TARGETS)
    }))
    return () => unsubs.forEach(u => u())
  }, [viewingPatientUid])

  // ── Active data (patient's when clinician is viewing, own otherwise) ───────
  const activeFbMealData       = viewingPatientUid ? patientFbMealData : fbMealData
  const nutritionalTargets     = viewingPatientUid ? patientNutritionalTargets : ownNutritionalTargets
  const allMealItems           = deriveMealItems(activeFbMealData)
  const mealStatuses           = deriveMealStatuses(fbMealData)   // always own (parent statuses)
  const parentNotesArray       = Object.values(parentNotesByDate)

  // ── Write functions ────────────────────────────────────────────────────────

  function setMealItems(date, mealType, items) {
    if (!uid) return
    set(ref(db, `users/${uid}/mealLogs/${date}/${mealType}/items`), items.length ? items : null)
    setFbMealData(prev => ({
      ...prev,
      [date]: {
        ...(prev[date] || {}),
        [mealType]: { ...(prev[date]?.[mealType] || {}), items },
      },
    }))
  }

  function setMealStatus(date, mealType, status) {
    if (!uid) return
    if (fbMealData[date]?.[mealType]?.status === status) return
    set(ref(db, `users/${uid}/mealLogs/${date}/${mealType}/status`), status)
    setFbMealData(prev => ({
      ...prev,
      [date]: {
        ...(prev[date] || {}),
        [mealType]: { ...(prev[date]?.[mealType] || {}), status },
      },
    }))
  }

  function saveNutritionalTargets(next) {
    // When clinician is viewing a patient, write targets to the patient's path
    const targetUid = viewingPatientUid || uid
    if (!targetUid) return
    set(ref(db, `users/${targetUid}/nutritionalTargets`), next)
    if (viewingPatientUid) setPatientNutritionalTargets(next)
    else setOwnNutritionalTargets(next)
  }

  function saveParentNote({ date, body, existingNoteId }) {
    if (!uid) return
    const note = existingNoteId
      ? { ...(parentNotesByDate[date] || {}), body, read_at: null }
      : { id: crypto.randomUUID(), date, body, read_at: null, created_at: new Date().toISOString() }
    set(ref(db, `users/${uid}/parentNotes/${date}`), note)
    setParentNotesByDate(prev => ({ ...prev, [date]: note }))
  }

  function markParentNoteReadById(noteId) {
    if (!uid) return
    const date = Object.keys(parentNotesByDate).find(d => parentNotesByDate[d]?.id === noteId)
    if (!date) return
    const note = { ...parentNotesByDate[date], read_at: new Date().toISOString() }
    set(ref(db, `users/${uid}/parentNotes/${date}`), note)
    setParentNotesByDate(prev => ({ ...prev, [date]: note }))
  }

  function updateMealTime(mealType, value) {
    if (!uid) return
    const next = { ...mealTimes, [mealType]: value }
    set(ref(db, `users/${uid}/mealTimes`), next)
    setMealTimes(next)
  }

  function toggleSupplement(date, nutrient) {
    if (!uid) return
    const existing = new Set(supplementLog[date] || [])
    if (existing.has(nutrient)) existing.delete(nutrient)
    else existing.add(nutrient)
    const arr = Array.from(existing)
    set(ref(db, `users/${uid}/supplementLog/${date}`), arr.length ? arr : null)
    setSupplementLog(prev => ({ ...prev, [date]: arr }))
  }

  function markClinicianNoteRead(note) {
    if (!uid) return
    const readAt = new Date().toISOString()
    const noteDate = note.created_at?.slice(0, 10)
    update(ref(db), {
      [`users/${uid}/clinicianNotesRead/${note.id}`]: { readAt, noteCreatedAt: note.created_at },
      [`users/${uid}/clinicianNotesRead/date:${noteDate}`]: { noteId: note.id, readAt, noteCreatedAt: note.created_at },
    })
    setClinicianNotesRead(prev => ({
      ...prev,
      [note.id]: { readAt, noteCreatedAt: note.created_at },
      ['date:' + noteDate]: { noteId: note.id, readAt, noteCreatedAt: note.created_at },
    }))
  }

  function saveClinicianNote(note) {
    if (!uid || savedClinicianNotes.some(n => n.id === note.id)) return
    const saved = { id: note.id, body: note.body, created_at: note.created_at, savedAt: new Date().toISOString() }
    set(ref(db, `users/${uid}/savedClinicianNotes/${note.id}`), saved)
    setSavedClinicianNotes(prev => [...prev, saved])
  }

  function unsaveClinicianNote(noteId) {
    if (!uid) return
    set(ref(db, `users/${uid}/savedClinicianNotes/${noteId}`), null)
    setSavedClinicianNotes(prev => prev.filter(n => n.id !== noteId))
  }

  function clearAllSavedNotes() {
    if (!uid) return
    set(ref(db, `users/${uid}/savedClinicianNotes`), null)
    setSavedClinicianNotes([])
  }

  async function addPatientByCode(code) {
    if (!uid) return { error: 'Not logged in' }
    const upper = code.toUpperCase().trim()
    if (!upper) return { error: 'Enter a family code' }
    const codeSnap = await get(ref(db, `familyCodes/${upper}`))
    if (!codeSnap.exists()) return { error: 'Family code not found' }
    const patientUid = codeSnap.val()
    if (patients.some(p => p.uid === patientUid)) return { error: 'Patient already added' }
    const emailSnap = await get(ref(db, `users/${patientUid}/email`))
    const email = emailSnap.val() || patientUid
    await set(ref(db, `users/${uid}/patients/${patientUid}`), { email, addedAt: new Date().toISOString() })
    return { success: true }
  }

  return (
    <FirebaseDataContext.Provider value={{
      allMealItems,
      mealStatuses,
      nutritionalTargets,
      saveNutritionalTargets,
      parentNotesByDate,
      parentNotesArray,
      saveParentNote,
      markParentNoteReadById,
      mealTimes,
      updateMealTime,
      supplementLog,
      toggleSupplement,
      clinicianNotesRead,
      markClinicianNoteRead,
      savedClinicianNotes,
      saveClinicianNote,
      unsaveClinicianNote,
      clearAllSavedNotes,
      setMealItems,
      setMealStatus,
      familyCode,
      patients,
      viewingPatientUid,
      setViewingPatientUid,
      addPatientByCode,
    }}>
      {children}
    </FirebaseDataContext.Provider>
  )
}

export function useFirebaseData() {
  return useContext(FirebaseDataContext)
}
