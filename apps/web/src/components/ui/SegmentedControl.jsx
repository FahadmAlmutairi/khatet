import { useLayoutEffect, useRef, useState } from 'react'

// A row of pill buttons where one is chosen. The chosen pill's tint slides to the button you
// press instead of jumping, so switching feels continuous. The tint is one element behind the
// buttons, measured from the chosen button; it appears in place on the first paint and only
// glides after that. Reduced motion turns the glide off (the global rule in index.css).
export default function SegmentedControl({ options, value, onChange, label, className = '' }) {
  const groupRef = useRef(null)
  const [pill, setPill] = useState(null)
  const [ready, setReady] = useState(false)

  useLayoutEffect(() => {
    const group = groupRef.current
    if (!group) return undefined
    const measure = () => {
      const chosen = group.querySelector('[aria-pressed="true"]')
      if (!chosen) return setPill(null)
      setPill({ x: chosen.offsetLeft, y: chosen.offsetTop, width: chosen.offsetWidth, height: chosen.offsetHeight })
    }
    measure()
    // The buttons can wrap or change width with the font, so measure again when the row resizes.
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure)
    observer?.observe(group)
    return () => observer?.disconnect()
  }, [value])

  // Turn the glide on only after the first position has painted.
  useLayoutEffect(() => {
    if (!pill || ready) return undefined
    const frame = requestAnimationFrame(() => setReady(true))
    return () => cancelAnimationFrame(frame)
  }, [pill, ready])

  return (
    <div
      ref={groupRef}
      role="group"
      aria-label={label}
      className={`relative isolate flex w-fit flex-wrap gap-1 rounded-full bg-white p-1 ring-1 ring-line ${className}`}
    >
      {pill && (
        <span
          aria-hidden="true"
          className={`segment-pill absolute top-0 left-0 -z-10 rounded-full bg-nav-active ${ready ? 'segment-pill-glide' : ''}`}
          style={{ width: pill.width, height: pill.height, transform: `translate(${pill.x}px, ${pill.y}px)` }}
        />
      )}
      {options.map(([optionValue, optionLabel]) => {
        const chosen = value === optionValue
        return (
          <button
            key={optionLabel}
            type="button"
            aria-pressed={chosen}
            onClick={() => onChange(optionValue)}
            className={`segment-button min-h-11 cursor-pointer rounded-full px-4 text-sm font-medium sm:min-h-9 ${
              chosen ? 'text-heading' : 'text-muted hover:bg-surface hover:text-heading'
            }`}
          >
            {optionLabel}
          </button>
        )
      })}
    </div>
  )
}
