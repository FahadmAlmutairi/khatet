import { useEffect, useId, useRef, useState } from 'react'
import { InfoIcon } from '../icons.jsx'

// A small "i" that explains something only when asked: hover or focus shows the tip,
// a tap or click keeps it open on touch screens, Esc or a tap elsewhere closes it.
export default function InfoTip({ label, children, align = 'left' }) {
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [pinned, setPinned] = useState(false)
  const rootRef = useRef(null)
  const tipId = useId()
  const open = hovered || focused || pinned

  useEffect(() => {
    if (!open) return undefined
    function onKeyDown(event) {
      if (event.key !== 'Escape') return
      // Close only the tip, not the window around it.
      event.preventDefault()
      event.stopPropagation()
      setHovered(false)
      setFocused(false)
      setPinned(false)
    }
    function onPointerDown(event) {
      if (!rootRef.current?.contains(event.target)) setPinned(false)
    }
    document.addEventListener('keydown', onKeyDown, true)
    document.addEventListener('pointerdown', onPointerDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
      document.removeEventListener('pointerdown', onPointerDown)
    }
  }, [open])

  return (
    <span
      ref={rootRef}
      className="relative inline-flex align-middle"
      onPointerEnter={(event) => event.pointerType === 'mouse' && setHovered(true)}
      onPointerLeave={(event) => event.pointerType === 'mouse' && setHovered(false)}
    >
      <button
        type="button"
        aria-label={label}
        aria-describedby={open ? tipId : undefined}
        aria-expanded={open}
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          setPinned((value) => !value)
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="-m-3.5 inline-flex size-11 items-center justify-center rounded-full text-muted hover:text-heading lg:-m-1 lg:size-6"
      >
        <InfoIcon />
      </button>
      {open && (
        <span
          id={tipId}
          role="tooltip"
          data-motion="enter"
          className={`absolute top-full z-40 mt-2 w-64 max-w-[calc(100vw-2rem)] rounded-lg bg-heading px-3 py-2 text-left text-sm leading-5 font-normal tracking-normal text-white normal-case shadow-lg ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {children}
        </span>
      )}
    </span>
  )
}
