import { useCallback, useEffect, useRef, useState } from 'react'
import { CloseIcon, UndoIcon } from '../icons.jsx'
import { ToastContext } from './toastContext.js'

const DURATION = { info: 6000, undo: 5000, error: 10000 }

function isTyping(element) {
  return element?.closest?.('input, textarea, select, [contenteditable="true"]')
}

// Short confirmations and failures, read out by screen readers through a live region.
// Failures stay longer so there is time to read them, and either kind can be closed (G10).
// show(message, tone, { onUndo, onExpire }) adds an Undo button for a few seconds; onExpire runs
// when the message leaves without Undo (timed out, closed, or replaced by another message).
export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null)
  const [paused, setPaused] = useState(false)
  const current = useRef(null)

  const finish = useCallback((undo) => {
    const leaving = current.current
    current.current = null
    setToast(null)
    setPaused(false)
    if (!leaving) return
    if (undo) leaving.onUndo?.()
    else leaving.onExpire?.()
  }, [])

  const show = useCallback(
    (message, tone = 'info', { onUndo, onExpire } = {}) => {
      // A new message replaces the old one, which then counts as accepted.
      if (current.current) finish(false)
      const next = { message, tone, onUndo, onExpire, id: Date.now() + Math.random() }
      current.current = next
      setToast(next)
    },
    [finish],
  )

  useEffect(() => {
    if (!toast || paused) return undefined
    const timer = setTimeout(() => finish(false), DURATION[toast.tone === 'error' ? 'error' : toast.onUndo ? 'undo' : 'info'])
    return () => clearTimeout(timer)
  }, [toast, paused, finish])

  // Ctrl+Z (Cmd+Z on a Mac) also undoes, unless the person is typing, where it undoes their text.
  useEffect(() => {
    if (!toast?.onUndo) return undefined
    function onKeyDown(event) {
      if (event.key.toLowerCase() !== 'z' || !(event.ctrlKey || event.metaKey) || event.shiftKey) return
      if (isTyping(document.activeElement)) return
      event.preventDefault()
      finish(true)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [toast, finish])

  // A pending change (such as a delete waiting out its Undo time) is saved if the page is left.
  useEffect(() => {
    function onPageHide() {
      if (current.current) finish(false)
    }
    window.addEventListener('pagehide', onPageHide)
    return () => window.removeEventListener('pagehide', onPageHide)
  }, [finish])

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
            // The timer waits while the pointer or keyboard focus is on the message.
            onPointerEnter={() => setPaused(true)}
            onPointerLeave={() => setPaused(false)}
            onFocus={() => setPaused(true)}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false)
            }}
            className={`pointer-events-auto flex max-w-md items-center gap-1 rounded-lg py-1 pr-1 pl-4 text-base text-white shadow-lg ${
              toast.tone === 'error' ? 'bg-blocked' : 'bg-heading'
            }`}
          >
            <p aria-hidden="true" className="flex-1 py-2 pr-1">
              {toast.message}
            </p>
            {toast.onUndo && (
              <button
                type="button"
                onClick={() => finish(true)}
                aria-label="Undo"
                aria-keyshortcuts="Control+Z Meta+Z"
                className="inline-flex h-11 min-w-11 shrink-0 items-center justify-center gap-1.5 rounded-md text-sm font-medium hover:bg-white/15 focus-visible:outline-white sm:px-3"
              >
                <UndoIcon />
                <span aria-hidden="true" className="hidden sm:inline">
                  Undo
                </span>
              </button>
            )}
            <button
              type="button"
              onClick={() => finish(false)}
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
