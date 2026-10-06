import { useEffect, useId, useRef } from 'react'
import { ArrowLeftIcon, CloseIcon } from '../icons.jsx'

// Built on the native <dialog> element: it traps focus, closes with Esc and
// returns focus to the control that opened it.
// variant "panel" is the centred mini page from Figma (task details): it draws its own header.
// variant "popover" drops down under the header buttons on desktop and fills the
// screen on mobile (Figma: Notifications panel 1035:1912 and mobile page 741:2).
// variant "page" is a centred window from sm up and a full page on mobile (Figma: Create task 1068:11244 and 736:2).
export default function Dialog({ open, onClose, title, description, children, footer, variant = 'modal', labelledBy, width }) {
  const ref = useRef(null)
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  const placement = {
    drawer: 'ml-auto mr-0 h-dvh max-h-dvh w-full max-w-full sm:max-w-[30rem] rounded-none sm:border-l backdrop:bg-heading/40',
    modal: 'm-auto w-[calc(100%-2rem)] max-w-xl rounded-2xl backdrop:bg-heading/40',
    panel:
      'mx-auto mt-4 mb-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-[640px] rounded-2xl border outline-none sm:m-auto sm:max-h-none sm:overflow-visible sm:rounded-[20px] shadow-[0_24px_48px_rgba(38,54,41,0.18)] backdrop:bg-heading/40',
    page:
      'm-0 h-dvh max-h-dvh w-full max-w-full bg-surface outline-none backdrop:bg-heading/40 sm:m-auto sm:h-fit sm:max-h-[calc(100dvh-2rem)] sm:w-[calc(100%-2rem)] sm:max-w-[var(--dialog-width,558px)] sm:overflow-visible sm:rounded-[16px] sm:border sm:bg-white sm:shadow-[0_10px_24px_rgba(20,31,23,0.12)]',
    popover:
      'm-0 h-dvh max-h-dvh w-full max-w-full bg-surface outline-none backdrop:bg-transparent lg:top-0 lg:bottom-auto lg:mt-[88px] lg:mr-8 lg:ml-auto lg:h-auto lg:max-h-[calc(100dvh-120px)] lg:w-[380px] lg:rounded-[16px] lg:border lg:bg-white lg:shadow-[0_12px_28px_rgba(20,31,23,0.16)]',
  }[variant]

  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy ?? titleId}
      style={width ? { '--dialog-width': `${width}px` } : undefined}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        if (event.target === ref.current) onClose()
      }}
      className={`border-line p-0 text-body ${variant === 'popover' || variant === 'page' ? '' : 'bg-white shadow-xl'} ${placement}`}
    >
      {open && variant === 'panel' && <div className="p-4 sm:p-6">{children}</div>}
      {open && (variant === 'popover' || variant === 'page') && children}
      {open && !['panel', 'popover', 'page'].includes(variant) && (
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

// The white top bar of a "page" dialog on mobile: a back link and an optional centred title.
export function MobileBackBar({ label, onBack, title }) {
  return (
    <div className="relative flex h-16 items-center justify-center bg-white px-5 sm:hidden">
      <button type="button" onClick={onBack} className="absolute left-5 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-action">
        <ArrowLeftIcon />
        {label}
      </button>
      {title && (
        <p aria-hidden="true" className="text-[17px] font-semibold text-body">
          {title}
        </p>
      )}
    </div>
  )
}
