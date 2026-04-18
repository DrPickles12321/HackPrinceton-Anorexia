import { createContext, useContext, useState, useCallback } from 'react'

export const ToastContext = createContext(null)

export function useToast() {
  return useContext(ToastContext)
}

export function useToastState() {
  const [toasts, setToasts] = useState([])

  const showToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random()
    setToasts(t => [...t, { id, message, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3000)
  }, [])

  return { toasts, showToast }
}
