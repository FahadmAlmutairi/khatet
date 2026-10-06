import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { CheckIcon } from '../icons.jsx'

// A menu button with arrow-key navigation, Esc to close and focus returned to the button.
export default function Menu({ label, buttonContent, buttonClassName = '', items, align = 'right', listClassName = 'min-w-56' }) {
  const [open, setOpen] = useState(false)
  const buttonRef = useRef(null)
  const listRef = useRef(null)
  const menuId = useId()

  const [up, setUp] = useState(false)

  // Opens upward when there is no room below but there is above, before it is painted.
  useLayoutEffect(() => {
    if (!open) return
    const list = listRef.current?.getBoundingClientRect()
    const button = buttonRef.current?.getBoundingClientRect()
    if (list && button && list.bottom > window.innerHeight - 8 && button.top - list.height - 14 > 0) setUp(true)
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    const list = listRef.current
    // preventScroll: focusing an item must not scroll the board or a lane under the menu.
    ;(list?.querySelector('[role="menuitem"][aria-current="true"]') ?? list?.querySelector('[role="menuitem"]:not([disabled])'))?.focus({
      preventScroll: true,
    })
    function onPointerDown(event) {
      if (!listRef.current?.contains(event.target) && !buttonRef.current?.contains(event.target)) show(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  function show(value) {
    setUp(false)
    setOpen(value)
  }

  function close() {
    show(false)
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
        onClick={() => show(!open)}
        onPointerDown={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') {
            event.preventDefault()
            show(true)
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
          className={`absolute z-30 ${up ? 'bottom-full mb-1.5' : 'mt-1.5'} rounded-xl border border-line bg-white p-2 shadow-[0_12px_24px_rgba(38,54,41,0.16)] ${listClassName} ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {items.map((item) =>
            item.heading ? (
              <li key={item.key} role="presentation" className="px-2 pt-1.5 pb-1.5 text-xs font-medium text-muted">
                {item.heading}
              </li>
            ) : item.note ? (
              <li key={item.key} role="presentation" className="px-2 pt-2 pb-1 text-xs leading-4 text-muted">
                {item.note}
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
                  className={`flex min-h-11 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-sm hover:bg-surface focus:bg-surface disabled:cursor-default disabled:text-muted ${
                    item.danger ? 'text-blocked' : 'text-body'
                  } ${item.current ? 'bg-nav-active font-medium' : ''}`}
                >
                  {item.icon}
                  <span className="flex-1">{item.label}</span>
                  {item.current && (
                    <>
                      <CheckIcon />
                      <span className="sr-only">(current)</span>
                    </>
                  )}
                </button>
              </li>
            ),
          )}
        </ul>
      )}
    </div>
  )
}
