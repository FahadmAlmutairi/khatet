import { useEffect, useId, useRef } from 'react'
import { CloseIcon } from '../icons.jsx'

// Built on the native <dialog> element: it traps focus, closes with Esc and
// returns focus to the control that opened it.
export default function Dialog({ open, onClose, title, description, children, footer, variant = 'modal', labelledBy }) {
  const ref = useRef(null)
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  const placement =
    variant === 'drawer'
      ? 'ml-auto mr-0 h-dvh max-h-dvh w-full max-w-full sm:max-w-[30rem] rounded-none sm:border-l'
      : 'm-auto w-[calc(100%-2rem)] max-w-xl rounded-2xl'

  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy ?? titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        if (event.target === ref.current) onClose()
      }}
      className={`border-line bg-white p-0 text-body shadow-xl backdrop:bg-heading/30 ${placement}`}
    >
      {open && (
        <div className="flex h-full flex-col">
          <div className="flex items-start justify-between gap-4 px-6 pt-6">
            <div>
              {title && (
                <h2 id={titleId} className="text-xl font-semibold text-heading">
                  {title}
                </h2>
              )}
              {description && (
                <p id={descriptionId} className="mt-1 text-base text-muted">
                  {description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="-mr-2 -mt-2 inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-heading hover:bg-surface"
            >
              <CloseIcon />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>
          {footer && <div className="flex flex-wrap justify-end gap-3 border-t border-line px-6 py-4">{footer}</div>}
        </div>
      )}
    </dialog>
  )
}
