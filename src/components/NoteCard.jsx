function formatRelativeTime(isoString) {
  const diff = Date.now() - new Date(isoString).getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

export default function NoteCard({ note, slotLabel, showMarkRead, onMarkRead, onDelete }) {
  return (
    <div className={`rounded-lg border p-4 transition-colors ${note.is_read ? 'bg-white border-gray-200' : 'bg-purple-50 border-purple-300'}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          {slotLabel ? (
            <span className="text-xs font-medium text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
              {slotLabel}
            </span>
          ) : (
            <span className="text-xs text-gray-400">General note</span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <time className="text-xs text-gray-400">{formatRelativeTime(note.created_at)}</time>
          {onDelete && (
            <button
              onClick={() => onDelete(note.id)}
              title="Delete note"
              className="text-gray-300 hover:text-red-500 transition-colors"
              aria-label="Delete note"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{note.body}</p>

      {showMarkRead && !note.is_read && (
        <button
          onClick={() => onMarkRead(note.id)}
          className="mt-3 text-xs text-purple-600 hover:text-purple-800 underline"
        >
          Mark as read
        </button>
      )}
      {showMarkRead && note.is_read && (
        <p className="mt-2 text-xs text-gray-400">✓ Read</p>
      )}
    </div>
  )
}
