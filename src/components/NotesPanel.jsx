import NoteCard from './NoteCard'
import NoteComposer from './NoteComposer'

const DAY_LABELS = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' }

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1) }

export default function NotesPanel({ notes, mealSlots, foodItems, mode, onSend, onMarkRead, onDelete }) {
  function getSlotLabel(slotId) {
    if (!slotId) return null
    const slot = mealSlots.find(s => s.id === slotId)
    if (!slot) return null
    const food = foodItems.find(f => f.id === slot.assigned_food_id)
    return `${DAY_LABELS[slot.day]} · ${capitalize(slot.meal_type)} · ${food?.name || '(unknown food)'}`
  }

  const unreadCount = notes.filter(n => !n.is_read).length
  const sorted = [...notes].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

  return (
    <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <header className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
        <h3 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
          Clinician Notes
          {unreadCount > 0 && (
            <span className="bg-purple-600 text-white text-xs rounded-full px-2 py-0.5">
              {unreadCount} new
            </span>
          )}
        </h3>
      </header>

      {mode === 'clinician' && (
        <div className="p-4 border-b border-gray-100">
          <NoteComposer mealSlots={mealSlots} foodItems={foodItems} onSend={onSend} />
        </div>
      )}

      <div className="divide-y divide-gray-100 max-h-[400px] overflow-y-auto">
        {sorted.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">
            {mode === 'clinician' ? 'No notes sent yet.' : 'No notes from your clinician yet.'}
          </p>
        ) : (
          sorted.map(note => (
            <div key={note.id} className="p-4">
              <NoteCard
                note={note}
                slotLabel={getSlotLabel(note.slot_id)}
                showMarkRead={mode === 'parent'}
                onMarkRead={onMarkRead}
                onDelete={onDelete}
              />
            </div>
          ))
        )}
      </div>
    </section>
  )
}
