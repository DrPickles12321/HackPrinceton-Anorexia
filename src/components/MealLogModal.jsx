import { useState, useEffect } from 'react'
import Modal from './Modal'
import MealNutritionPanel from './MealNutritionPanel'

const DAY_LABELS = {
  mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday',
  fri: 'Friday', sat: 'Saturday', sun: 'Sunday',
}

const STATUS_CONFIG = {
  okay:      { emoji: '✅', label: 'Okay',      selected: 'bg-green-100 border-green-500 text-green-900' },
  difficult: { emoji: '😓', label: 'Difficult', selected: 'bg-yellow-100 border-yellow-500 text-yellow-900' },
  refused:   { emoji: '❌', label: 'Refused',   selected: 'bg-red-100 border-red-500 text-red-900' },
}

export default function MealLogModal({ isOpen, onClose, slot, foodName, foodCategory, onSubmit }) {
  const [status, setStatus] = useState(null)
  const [note, setNote] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setStatus(null)
      setNote('')
      setIsSubmitting(false)
    }
  }, [isOpen, slot?.id])

  async function handleSubmit() {
    if (!status || !slot?.id || isSubmitting) return
    setIsSubmitting(true)
    try {
      await onSubmit({ slotId: slot.id, status, note: note.trim() || null })
      setStatus(null)
      setNote('')
      onClose()
    } catch (err) {
      console.error('Failed to save meal log:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const syncWarning = slot && !slot.id

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="How did this meal go?">
      {slot && (
        <p className="text-sm text-gray-500 mb-4">
          {DAY_LABELS[slot.day]} · {slot.meal_type.charAt(0).toUpperCase() + slot.meal_type.slice(1)} · {foodName}
        </p>
      )}

      {foodName && (
        <MealNutritionPanel
          foods={[{ name: foodName, category: foodCategory || 'familiar' }]}
          mode="parent"
        />
      )}

      <div className="flex gap-2 mb-4 mt-4">
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
          <button
            key={key}
            onClick={() => setStatus(key)}
            aria-pressed={status === key}
            className={`flex-1 border rounded-lg py-3 text-sm font-medium transition-colors ${
              status === key ? cfg.selected : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {cfg.emoji} {cfg.label}
          </button>
        ))}
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Add a note (optional)
        </label>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Anything your clinician should know? (optional)"
          rows={3}
          maxLength={500}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
        />
        <p className="text-xs text-gray-400 text-right mt-1">{note.length} / 500</p>
      </div>

      {syncWarning && (
        <p className="text-xs text-amber-600 mb-2">
          This meal slot is still syncing. Try again in a moment.
        </p>
      )}

      <div className="flex justify-end gap-2">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={!status || isSubmitting || syncWarning}
          className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Saving...' : 'Save log'}
        </button>
      </div>
    </Modal>
  )
}
