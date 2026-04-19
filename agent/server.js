import { Spectrum } from 'spectrum-ts'
import { imessage } from 'spectrum-ts/providers/imessage'
import { supabase } from './supabaseClient.js'
import { buildWeekSummary, getTodayDinner, getStreaks } from './mealSummary.js'
import {
  reactiveResponse, dinnerWindowMessage, appointmentPrepMessage,
  sundaySummaryMessage, sosFollowUpQuestion, sosClinicianAlert,
  analyzeMealPhoto, mealPhotoLogConfirmation, morningCheckin,
} from './claudeClient.js'

const THREAD_ID       = process.env.SPECTRUM_THREAD_ID
const CLINICIAN_PHONE = process.env.CLINICIAN_PHONE
const DINNER_HOUR     = parseInt(process.env.DINNER_WINDOW_HOUR   || '20', 10)
const DINNER_MINUTE   = parseInt(process.env.DINNER_WINDOW_MINUTE || '30', 10)
const CHECKIN_HOUR    = parseInt(process.env.CHECKIN_HOUR || '8', 10)

if (!THREAD_ID) {
  console.error('Missing required env var: SPECTRUM_THREAD_ID')
  process.exit(1)
}

const threadHistory = []
function pushHistory(sender, msgText) {
  threadHistory.push({ sender, text: msgText })
  if (threadHistory.length > 20) threadHistory.shift()
}

let spectrum
let activeSpace = null
let clinicianSpace = null

// SOS state — waiting for parent's follow-up after we asked "what's happening?"
let awaitingSosDetail = false
let lastMealPhotoDescription = null  // waiting for parent to confirm photo log

async function sendToThread(msgText) {
  if (activeSpace) await activeSpace.send(msgText)
}

// ── Morning check-in timer ─────────────────────────────────────────────────
let checkinFiredToday = null

function startCheckinTimer() {
  setInterval(async () => {
    const now = new Date()
    const todayKey = now.toISOString().split('T')[0]
    if (now.getHours() !== CHECKIN_HOUR || now.getMinutes() > 10) return
    if (checkinFiredToday === todayKey) return
    checkinFiredToday = todayKey
    try {
      const yesterdayDinner = await getTodayDinner(supabase)
      const msg = await morningCheckin(yesterdayDinner)
      await sendToThread(msg)
      console.log('[checkin] sent morning check-in')
    } catch (err) {
      console.error('[checkin] error:', err)
    }
  }, 5 * 60 * 1000)
}

// ── Dinner window timer ────────────────────────────────────────────────────
let dinnerFiredToday = null

function startDinnerTimer() {
  setInterval(async () => {
    const now = new Date()
    const todayKey = now.toISOString().split('T')[0]
    if (now.getHours() !== DINNER_HOUR || now.getMinutes() < DINNER_MINUTE) return
    if (dinnerFiredToday === todayKey) return
    dinnerFiredToday = todayKey
    try {
      const dinnerEvent = await getTodayDinner(supabase)
      if (!dinnerEvent || dinnerEvent.status === 'refused') {
        const msg = await dinnerWindowMessage(dinnerEvent)
        await sendToThread(msg)
        console.log('[dinner timer] sent')
      }
    } catch (err) {
      console.error('[dinner timer] error:', err)
    }
  }, 15 * 60 * 1000)
}

// ── Sunday summary timer ───────────────────────────────────────────────────
let sundayFiredThisWeek = null

function startSundayTimer() {
  setInterval(async () => {
    const now = new Date()
    if (now.getDay() !== 0 || now.getHours() !== 20) return
    const weekKey = now.toISOString().slice(0, 10)
    if (sundayFiredThisWeek === weekKey) return
    sundayFiredThisWeek = weekKey
    try {
      const [weekSummary, streaks] = await Promise.all([buildWeekSummary(supabase), getStreaks(supabase)])
      const msg = await sundaySummaryMessage(weekSummary, streaks)
      await sendToThread(msg)
      console.log('[sunday summary] sent')
    } catch (err) {
      console.error('[sunday timer] error:', err)
    }
  }, 30 * 60 * 1000)
}

// ── Appointment prep timer ─────────────────────────────────────────────────
function startAppointmentTimer() {
  setInterval(async () => {
    try {
      const now = new Date()
      const soon = new Date(now.getTime() + 35 * 60 * 1000)
      const { data, error } = await supabase
        .from('appointments').select('*')
        .gte('scheduled_at', now.toISOString())
        .lte('scheduled_at', soon.toISOString())
        .eq('prep_sent', false)
      if (error) return

      const [weekSummary, streaks] = await Promise.all([buildWeekSummary(supabase), getStreaks(supabase)])
      for (const appt of data || []) {
        const msg = await appointmentPrepMessage(weekSummary, appt.clinician_name, streaks)
        await sendToThread(msg)
        await supabase.from('appointments').update({ prep_sent: true }).eq('id', appt.id)
        console.log('[appt timer] sent prep for:', appt.clinician_name)
      }
    } catch (err) {
      console.error('[appt timer] error:', err)
    }
  }, 15 * 60 * 1000)
}

// ── Main ───────────────────────────────────────────────────────────────────
async function main() {
  console.log('Connecting to Spectrum...')
  spectrum = await Spectrum({
    projectId: process.env.SPECTRUM_PROJECT_ID,
    projectSecret: process.env.SPECTRUM_PROJECT_SECRET,
    providers: [imessage.config()],
  })
  console.log('Connected. Listening on thread:', THREAD_ID)

  startCheckinTimer()
  startDinnerTimer()
  startSundayTimer()
  startAppointmentTimer()

  for await (const [space, message] of spectrum.messages) {
    console.log('[incoming] space.id:', space.id)

    // Store clinician space
    if (CLINICIAN_PHONE && space.id === `any;-;${CLINICIAN_PHONE}`) {
      clinicianSpace = space
      console.log('[clinician] space stored')
      continue
    }

    if (space.id !== THREAD_ID) continue

    activeSpace = space

    // ── Photo message ────────────────────────────────────────────────────
    if (message.content?.type === 'attachment') {
      console.log('[photo] attachment received')
      try {
        const bytes = await message.content.read()
        const base64 = Buffer.from(bytes).toString('base64')
        const description = await analyzeMealPhoto(base64)
        lastMealPhotoDescription = description
        await space.send(description)
        pushHistory('agent', description)
      } catch (err) {
        console.error('[photo] error:', err)
      }
      continue
    }

    const msgText = message.content?.text || message.content?.[0]?.text || message.text || ''
    if (!msgText.trim()) continue

    const sender = message.sender?.id || 'unknown'
    pushHistory(sender, msgText)
    console.log(`[message] ${sender}: ${msgText}`)

    // ── Photo log confirmation ───────────────────────────────────────────
    if (lastMealPhotoDescription && /yes|log|save|add|sure|ok/i.test(msgText)) {
      try {
        const days = ['sun','mon','tue','wed','thu','fri','sat']
        const today = days[new Date().getDay()]
        const { data: slot } = await supabase
          .from('meal_slots').select('id')
          .eq('family_id', process.env.FAMILY_ID || '11111111-1111-1111-1111-111111111111')
          .eq('day', today).limit(1).maybeSingle()
        if (slot) {
          await supabase.from('meal_logs').insert({ meal_slot_id: slot.id, status: 'okay', note: `Photo: ${lastMealPhotoDescription}` })
        }
        const confirm = await mealPhotoLogConfirmation(lastMealPhotoDescription)
        await space.send(confirm)
        pushHistory('agent', confirm)
        lastMealPhotoDescription = null
      } catch (err) {
        console.error('[photo log] error:', err)
      }
      continue
    }

    // ── SOS flow ─────────────────────────────────────────────────────────
    if (/\bsos\b/i.test(msgText)) {
      console.log('[SOS] detected')
      awaitingSosDetail = true
      try {
        const question = await sosFollowUpQuestion()
        await space.send(question)
        pushHistory('agent', question)
      } catch (err) {
        console.error('[SOS] error:', err)
      }
      continue
    }

    if (awaitingSosDetail) {
      awaitingSosDetail = false
      console.log('[SOS] relaying detail to clinician')
      try {
        const weekSummary = await buildWeekSummary(supabase)
        const alert = await sosClinicianAlert(msgText, weekSummary)
        await space.send('Thank you for telling me. I\'ve alerted your clinician with the full context.')
        if (clinicianSpace) await clinicianSpace.send(`🚨 Parent needs support: ${alert}`)
        console.log('[SOS] clinician alerted')
      } catch (err) {
        console.error('[SOS relay] error:', err)
      }
      continue
    }

    // ── Normal reactive response ─────────────────────────────────────────
    try {
      const [weekSummary, streaks] = await Promise.all([buildWeekSummary(supabase), getStreaks(supabase)])
      const last5 = threadHistory.slice(-5)
      const { shouldRespond, reply } = await reactiveResponse(last5, weekSummary, streaks)

      if (shouldRespond && reply) {
        await space.send(reply)
        pushHistory('agent', reply)
        console.log('[agent reply]', reply)
      } else {
        console.log('[agent] chose not to respond')
      }
    } catch (err) {
      console.error('[message handler] error:', err)
    }
  }
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
