import { useToast, ToastContext, useToastState } from '../hooks/useToast'

const TYPE_STYLES = {
  success: 'bg-green-600 text-white',
  error:   'bg-red-600 text-white',
  info:    'bg-gray-800 text-white',
}

export function ToastProvider({ children }) {
  const { toasts, showToast } = useToastState()
  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <ToastContainer toasts={toasts} />
    </ToastContext.Provider>
  )
}

function ToastContainer({ toasts }) {
  if (toasts.length === 0) return null
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`px-4 py-3 rounded-lg shadow-lg min-w-[240px] text-sm font-medium ${TYPE_STYLES[t.type] || TYPE_STYLES.info}`}
        >
          {t.message}
        </div>
      ))}
    </div>
  )
}
