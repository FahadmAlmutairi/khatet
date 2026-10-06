import { useEffect, useId, useRef } from 'react'
import { animate } from '../../lib/motion.js'

const LENGTH = 6

// Six one-digit boxes that act as one field: typing moves forward, Backspace moves
// back, and pasting or the phone's one-time-code suggestion fills every box.
export default function CodeInput({ value, onChange, error, label = 'Verification code' }) {
  const id = useId()
  const refs = useRef([])
  const digits = Array.from({ length: LENGTH }, (_, index) => value[index] ?? '')
  // Focus moves to the next box before React re-renders, so the newest code is kept here too.
  const latest = useRef(value)
  useEffect(() => {
    latest.current = value
  }, [value])

  const current = () => Array.from({ length: LENGTH }, (_, index) => latest.current[index] ?? '')

  function change(next) {
    latest.current = next
    onChange(next)
  }

  function placeCaret(input) {
    const end = input.value.length
    input.setSelectionRange(end, end)
  }

  function focusBox(index) {
    refs.current[Math.min(Math.max(index, 0), LENGTH - 1)]?.focus()
  }

  // The code is one string, so a digit can only go in the first empty box. Clicking a later box
  // moves the caret there; otherwise the digit would show up in a different box from the caret.
  function onFocusBox(event, index) {
    const firstEmpty = latest.current.length < LENGTH ? latest.current.length : -1
    if (firstEmpty !== -1 && index > firstEmpty) {
      focusBox(firstEmpty)
      return
    }
    placeCaret(event.target)
  }

  // The caret starts in the first box when the page opens.
  useEffect(() => {
    focusBox(0)
  }, [])

  const rowRef = useRef(null)

  // A wrong or expired code gives the boxes one small shake and puts the cursor back in the first box.
  useEffect(() => {
    if (!error) return
    animate(
      rowRef.current,
      [
        { transform: 'translateX(0)' },
        { transform: 'translateX(-4px)' },
        { transform: 'translateX(3px)' },
        { transform: 'translateX(-2px)' },
        { transform: 'translateX(0)' },
      ],
      { duration: 320, easing: 'ease-out' },
    )
    refs.current[0]?.focus()
  }, [error])

  function fill(start, text) {
    const incoming = text.replace(/\D/g, '')
    if (!incoming) return
    const next = current()
    for (let i = 0; i < incoming.length && start + i < LENGTH; i += 1) {
      next[start + i] = incoming[i]
      // Each digit settles into its box.
      animate(refs.current[start + i], [{ transform: 'scale(0.94)' }, { transform: 'scale(1)' }], { duration: 180 })
    }
    change(next.join('').slice(0, LENGTH))
    focusBox(start + incoming.length)
  }

  function onKeyDown(event, index) {
    if (event.key === 'Backspace') {
      event.preventDefault()
      const next = current()
      if (next[index]) {
        next[index] = ''
      } else if (index > 0) {
        next[index - 1] = ''
        focusBox(index - 1)
      }
      change(next.join(''))
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault()
      focusBox(index - 1)
    } else if (event.key === 'ArrowRight') {
      event.preventDefault()
      focusBox(index + 1)
    }
  }

  return (
    <div role="group" aria-labelledby={`${id}-label`} aria-describedby={error ? `${id}-error` : undefined} className="flex flex-col gap-2">
      <span id={`${id}-label`} className="text-xs leading-normal font-medium text-body">
        {label}
      </span>
      <div ref={rowRef} className="flex gap-1.5 sm:gap-2.5">
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(node) => {
              refs.current[index] = node
            }}
            value={digit}
            onChange={(event) => {
              const typed = event.target.value
              if (!typed) {
                change(digits.map((item, at) => (at === index ? '' : item)).join(''))
                return
              }
              // A full code (autofill) fills from the first box; otherwise keep the digit just typed,
              // whichever side of the old digit the caret was on.
              if (typed.replace(/\D/g, '').length >= LENGTH) fill(0, typed)
              else fill(index, digit ? typed.replace(digit, '') || digit : typed)
            }}
            onKeyDown={(event) => onKeyDown(event, index)}
            onPaste={(event) => {
              event.preventDefault()
              fill(index, event.clipboardData.getData('text'))
            }}
            // A blinking caret after the digit, as in any text field, instead of a highlighted digit.
            onFocus={(event) => onFocusBox(event, index)}
            onMouseUp={(event) => {
              if (event.target === document.activeElement) placeCaret(event.target)
            }}
            inputMode="numeric"
            autoComplete={index === 0 ? 'one-time-code' : 'off'}
            aria-label={`Digit ${index + 1} of ${LENGTH}`}
            aria-invalid={Boolean(error)}
            className="h-14 min-w-0 flex-1 rounded-[10px] caret-action border border-line bg-white text-center text-[22px] font-semibold text-body focus:border-2 focus:border-action focus-visible:outline-none aria-[invalid=true]:border-2 aria-[invalid=true]:border-blocked"
          />
        ))}
      </div>
      {error && (
        <p id={`${id}-error`} className="text-sm font-medium text-blocked">
          {error}
        </p>
      )}
    </div>
  )
}
