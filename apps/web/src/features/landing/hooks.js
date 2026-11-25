import { useEffect, useState, useSyncExternalStore } from 'react'

const REDUCE_QUERY = '(prefers-reduced-motion: reduce)'

function subscribeReduced(onChange) {
  const query = window.matchMedia?.(REDUCE_QUERY)
  query?.addEventListener('change', onChange)
  return () => query?.removeEventListener('change', onChange)
}

// True when the visitor asked for reduced motion; follows the setting if it changes.
export function useReducedMotion() {
  return useSyncExternalStore(
    subscribeReduced,
    () => Boolean(window.matchMedia?.(REDUCE_QUERY).matches),
    () => true,
  )
}

// True while the element is on screen. Without IntersectionObserver (old browsers, tests) it is always true.
export function useInView(ref, { threshold = 0.2, rootMargin = '0px' } = {}) {
  const [inView, setInView] = useState(() => typeof IntersectionObserver === 'undefined')
  useEffect(() => {
    const node = ref.current
    if (!node || typeof IntersectionObserver === 'undefined') return undefined
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold, rootMargin })
    observer.observe(node)
    return () => observer.disconnect()
  }, [ref, threshold, rootMargin])
  return inView
}

// Marks every [data-reveal] element inside the root as shown the first time it scrolls into view.
// The hidden starting state only applies under .landing-motion, which is set when motion is allowed.
export function useReveal(rootRef, enabled) {
  useEffect(() => {
    const root = rootRef.current
    if (!root || !enabled || typeof IntersectionObserver === 'undefined') return undefined
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          entry.target.setAttribute('data-shown', '')
          observer.unobserve(entry.target)
        }
      },
      // Any visible part counts, so a section taller than the screen is still revealed.
      { threshold: 0, rootMargin: '0px 0px -10% 0px' },
    )
    root.querySelectorAll('[data-reveal]:not([data-shown])').forEach((node) => observer.observe(node))
    return () => observer.disconnect()
  }, [rootRef, enabled])
}
