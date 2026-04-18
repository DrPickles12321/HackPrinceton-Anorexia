import { useState, useEffect } from 'react'
import Modal from './Modal'
import MealNutritionPanel from './MealNutritionPanel'
import { supabase } from '../lib/supabase'

const DAY_TO_OFFSET = { mon: 0, tue: 1, wed: 2, thu: 3, fri: 4, sat: 5, sun: 6 }

function slotDayToISODate(dayKey) {
  const today = new Date()
  const dow = today.getDay()
  const mondayOffset = dow === 0 ? -6 : 1 - dow
  const monday = new Date(today)
  monday.setDate(today.getDate() + mondayOffset)
  monday.setDate(monday.getDate() + (DAY_TO_OFFSET[dayKey] ?? 0))
  return monday.toISOString().split('T')[0]
}

const DAY_LABELS = {
  mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday',
  fri: 'Friday', sat: 'Saturday', sun: 'Sunday',
}

const STATUS_OPTIONS = [
  { key: 'okay',      emoji: '😌', label: 'Okay',      color: 'var(--mint)',  bg: 'var(--mint-light)',  border: 'var(--mint-mid)' },
  { key: 'difficult', emoji: '😰', label: 'Difficult', color: 'var(--peach)', bg: 'var(--peach-light)', border: 'var(--peach-mid)' },
  { key: 'refused',   emoji: '🙅', label: 'Refused',   color: 'var(--pink)',  bg: 'var(--pink-light)',  border: 'var(--pink-mid)' },
]

export default function MealLogModal({ isOpen, onClose, slot, foodName, foodCategory, onSubmit }) {
  const [status, setStatus]             = useState(null)
  const [note, setNote]                 = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen) { setStatus(null); setNote(''); setIsSubmitting(false) }
  }, [isOpen, slot?.id])

  async function handleSubmit() {
    if (!status || !slot?.id || isSubmitting) return
    setIsSubmitting(true)
    try {
      await onSubmit({ slotId: slot.id, status, note: note.trim() || null })
    } catch (err) {
      console.error('Failed to save meal log:', err)
      setIsSubmitting(false)
      return
    }
    // Primary write succeeded. Sync to agent table — never block UX on this.
    try {
      const date = slotDayToISODate(slot.day)
      const foodItems = foodName ? [{ name: foodName, category: foodCategory || 'familiar' }] : []
      await supabase.from('meal_events').insert({
        date,
        meal_type: slot.meal_type,
        status,
        food_items: foodItems,
      })
    } catch (syncErr) {
      console.warn('Agent sync failed (non-critical):', syncErr)
    }
    setIsSubmitting(false)
    setStatus(null); setNote(''); onClose()
  }

  const syncWarning = slot && !slot.id

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="How did this meal go?">
      {slot && (
        <p style={{ fontSize: 13, color: 'var(--text-mid)', marginBottom: 16, lineHeight: 1.5 }}>
          {DAY_LABELS[slot.day]} · {slot.meal_type.charAt(0).toUpperCase() + slot.meal_type.slice(1)}
          {foodName ? ` · ${foodName}` : ''}
        </p>
      )}

      {foodName && (
        <MealNutritionPanel
          foods={[{ name: foodName, category: foodCategory || 'familiar' }]}
          mode="parent"
        />
      )}

      <div style={{ display: 'flex', gap: 9, marginBottom: 20, marginTop: 16 }}>
        {STATUS_OPTIONS.map(opt => {
          const selected = status === opt.key
          return (
            <button
              key={opt.key}
              onClick={() => setStatus(opt.key)}
              aria-pressed={selected}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: 7, padding: '16px 8px', borderRadius: 16,
                border: `1.5px solid ${selected ? opt.border : 'var(--border)'}`,
                background: selected ? opt.bg : 'white',
                cursor: 'pointer', transition: 'all 0.15s',
                boxShadow: selected ? `0 3px 12px ${opt.color}28` : '0 1px 4px rgba(39,23,6,0.05)',
                fontFamily: "'Outfit', sans-serif",
              }}
            >
              <span style={{ fontSize: 28 }}>{opt.emoji}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: selected ? opt.color : 'var(--text-light)' }}>
                {opt.label}
              </span>
            </button>
          )
        })}
      </div>

      <div style={{ marginBottom: 20 }}>
        <label style={{
          display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-light)',
          textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 9,
        }}>
          Add a note (optional)
        </label>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Anything your clinician should know?"
          rows={3}
          maxLength={500}
          style={{
            width: '100%', border: '1.5px solid var(--border)', borderRadius: 12,
            padding: '10px 13px', fontSize: 13, color: 'var(--text-dark)',
            resize: 'none', outline: 'none', fontFamily: "'Outfit', sans-serif",
            lineHeight: 1.55, boxSizing: 'border-box', background: 'var(--surface-warm)',
            transition: 'border-color 0.15s, box-shadow 0.15s',
          }}
          onFocus={e => { e.target.style.borderColor = 'var(--coral)'; e.target.style.boxShadow = '0 0 0 3px rgba(184,85,53,0.10)' }}
          onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none' }}
        />
        <p style={{ fontSize: 11, color: 'var(--text-light)', textAlign: 'right', marginTop: 4 }}>{note.length} / 500</p>
      </div>

      {syncWarning && (
        <p style={{ fontSize: 12, color: 'var(--peach)', marginBottom: 12 }}>
          This meal slot is still syncing. Try again in a moment.
        </p>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <button
          onClick={onClose}
          style={{
            padding: '10px 20px', fontSize: 13, borderRadius: 12,
            border: '1.5px solid var(--border)', background: 'white',
            cursor: 'pointer', color: 'var(--text-mid)', fontFamily: "'Outfit', sans-serif",
          }}
        >Cancel</button>
        <button
          onClick={handleSubmit}
          disabled={!status || isSubmitting || syncWarning}
          style={{
            padding: '10px 22px', fontSize: 13, borderRadius: 12, border: 'none',
            background: status ? 'linear-gradient(135deg, var(--coral) 0%, var(--pink) 100%)' : 'var(--border)',
            color: status ? 'white' : 'var(--text-light)',
            cursor: status && !syncWarning ? 'pointer' : 'not-allowed',
            opacity: (!status || syncWarning) ? 0.5 : 1,
            fontWeight: 600, fontFamily: "'Outfit', sans-serif",
            transition: 'all 0.15s',
            boxShadow: status ? '0 3px 10px rgba(184,85,53,0.28)' : 'none',
          }}
        >
          {isSubmitting ? 'Saving…' : 'Save log'}
        </button>
      </div>
    </Modal>
  )
}
