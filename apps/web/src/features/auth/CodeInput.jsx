import { useEffect, useId, useRef } from 'react'

const LENGTH = 6

// Six one-digit boxes that act as one field: typing moves forward, Backspace moves
// back, and pasting or the phone's one-time-code suggestion fills every box.
export default function CodeInput({ value, onChange, error, label = 'Verification code' }) {
  const id = useId()
  const refs = useRef([])
  const digits = Array.from({ length: LENGTH }, (_, index) => value[index] ?? '')

  function focusBox(index) {
    refs.current[Math.min(Math.max(index, 0), LENGTH - 1)]?.focus()
  }

  // A wrong or expired code puts the cursor back in the first box, ready for a new code.
  useEffect(() => {
    if (error) refs.current[0]?.focus()
  }, [error])

  function fill(start, text) {
    const incoming = text.replace(/\D/g, '')
    if (!incoming) return
    const next = [...digits]
    for (let i = 0; i < incoming.length && start + i < LENGTH; i += 1) next[start + i] = incoming[i]
    onChange(next.join('').slice(0, LENGTH))
    focusBox(start + incoming.length)
  }

  function onKeyDown(event, index) {
    if (event.key === 'Backspace') {
      event.preventDefault()
      const next = [...digits]
      if (next[index]) {
        next[index] = ''
      } else if (index > 0) {
        next[index - 1] = ''
        focusBox(index - 1)
      }
      onChange(next.join(''))
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
      <div className="flex gap-1.5 sm:gap-2.5">
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(node) => {
              refs.current[index] = node
            }}
            value={digit}
            onChange={(event) => {
              const typed = event.target.value
              // A full code (autofill) fills from the first box; otherwise keep the newest digit.
              if (typed.replace(/\D/g, '').length >= LENGTH) fill(0, typed)
              else fill(index, typed.slice(-1))
            }}
            onKeyDown={(event) => onKeyDown(event, index)}
            onPaste={(event) => {
              event.preventDefault()
              fill(index, event.clipboardData.getData('text'))
            }}
            onFocus={(event) => event.target.select()}
            inputMode="numeric"
            autoComplete={index === 0 ? 'one-time-code' : 'off'}
            aria-label={`Digit ${index + 1} of ${LENGTH}`}
            aria-invalid={Boolean(error)}
            className="h-14 min-w-0 flex-1 rounded-[10px] border border-line bg-white text-center text-[22px] font-semibold text-body focus:border-2 focus:border-action focus-visible:outline-none aria-[invalid=true]:border-2 aria-[invalid=true]:border-blocked"
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
