import { useEffect, useId, useRef, useState } from 'react'

// A menu button with arrow-key navigation, Esc to close and focus returned to the button.
export default function Menu({ label, buttonContent, buttonClassName = '', items, align = 'right' }) {
  const [open, setOpen] = useState(false)
  const buttonRef = useRef(null)
  const listRef = useRef(null)
  const menuId = useId()

  useEffect(() => {
    if (!open) return undefined
    listRef.current?.querySelector('[role="menuitem"]:not([disabled])')?.focus()
    function onPointerDown(event) {
      if (!listRef.current?.contains(event.target) && !buttonRef.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  function close() {
    setOpen(false)
    buttonRef.current?.focus()
  }

  function onKeyDown(event) {
    const options = [...listRef.current.querySelectorAll('[role="menuitem"]:not([disabled])')]
    const index = options.indexOf(document.activeElement)
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      options[(index + 1) % options.length]?.focus()
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      options[(index - 1 + options.length) % options.length]?.focus()
    } else if (event.key === 'Home') {
      event.preventDefault()
      options[0]?.focus()
    } else if (event.key === 'End') {
      event.preventDefault()
      options.at(-1)?.focus()
    } else if (event.key === 'Escape' || event.key === 'Tab') {
      event.preventDefault()
      close()
    }
  }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((value) => !value)}
        onPointerDown={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') {
            event.preventDefault()
            setOpen(true)
          }
        }}
        className={buttonClassName}
      >
        {buttonContent}
      </button>
      {open && (
        <ul
          ref={listRef}
          id={menuId}
          role="menu"
          aria-label={label}
          onKeyDown={onKeyDown}
          onPointerDown={(event) => event.stopPropagation()}
          className={`absolute z-30 mt-1 min-w-56 rounded-xl border border-line bg-white p-1 shadow-lg ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {items.map((item) =>
            item.heading ? (
              <li key={item.key} role="presentation" className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-muted">
                {item.heading}
              </li>
            ) : (
              <li key={item.key} role="none">
                <button
                  type="button"
                  role="menuitem"
                  disabled={item.disabled}
                  aria-current={item.current || undefined}
                  onClick={() => {
                    close()
                    item.onSelect()
                  }}
                  className={`flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-left text-base hover:bg-surface focus:bg-surface disabled:cursor-default disabled:text-muted ${
                    item.danger ? 'text-blocked' : 'text-body'
                  }`}
                >
                  {item.icon}
                  <span className="flex-1">{item.label}</span>
                  {item.current && <span className="text-sm text-muted">Current</span>}
                </button>
              </li>
            ),
          )}
        </ul>
      )}
    </div>
  )
}
