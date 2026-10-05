import { useCallback, useEffect, useState } from 'react'
import { ToastContext } from './toastContext.js'

// Short confirmations and failures, read out by screen readers through a live region.
export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null)

  const show = useCallback((message, tone = 'info') => {
    setToast({ message, tone, id: Date.now() })
  }, [])

  useEffect(() => {
    if (!toast) return undefined
    const timer = setTimeout(() => setToast(null), 6000)
    return () => clearTimeout(timer)
  }, [toast])

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div aria-live="polite" role="status" className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex justify-center">
        {toast && (
          <p
            key={toast.id}
            className={`pointer-events-auto max-w-md rounded-lg px-4 py-3 text-base shadow-lg ${
              toast.tone === 'error' ? 'bg-blocked text-white' : 'bg-heading text-white'
            }`}
          >
            {toast.message}
          </p>
        )}
      </div>
    </ToastContext.Provider>
  )
}
