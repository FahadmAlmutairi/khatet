import { useCallback, useEffect, useState } from 'react'
import { CloseIcon } from '../icons.jsx'
import { ToastContext } from './toastContext.js'

// Short confirmations and failures, read out by screen readers through a live region.
// Failures stay longer so there is time to read them, and either kind can be closed (G10).
export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null)

  const show = useCallback((message, tone = 'info') => {
    setToast({ message, tone, id: Date.now() })
  }, [])

  useEffect(() => {
    if (!toast) return undefined
    const timer = setTimeout(() => setToast(null), toast.tone === 'error' ? 10000 : 6000)
    return () => clearTimeout(timer)
  }, [toast])

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div role="status" aria-live="polite" className="sr-only">
        {toast?.message}
      </div>
      <div className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex justify-center">
        {toast && (
          <div
            key={toast.id}
            data-motion="enter"
            className={`pointer-events-auto flex max-w-md items-start gap-2 rounded-lg py-1 pr-1 pl-4 text-base text-white shadow-lg ${
              toast.tone === 'error' ? 'bg-blocked' : 'bg-heading'
            }`}
          >
            <p aria-hidden="true" className="py-2">
              {toast.message}
            </p>
            <button
              type="button"
              onClick={() => setToast(null)}
              aria-label="Dismiss message"
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-md hover:bg-white/15 focus-visible:outline-white"
            >
              <CloseIcon />
            </button>
          </div>
        )}
      </div>
    </ToastContext.Provider>
  )
}
