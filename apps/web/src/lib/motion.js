// One motion language for the app, modelled on Apple's: short, small distances, a quick start
// and a soft landing. Everything moves with transform and opacity only, so the browser can run
// it on the compositor without layout work, and nothing moves for people who ask for reduced motion.

export const EASE = 'cubic-bezier(0.32, 0.72, 0, 1)'

export function reducedMotion() {
  return typeof window === 'undefined' || !window.matchMedia || window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function animate(element, keyframes, options) {
  if (!element?.animate || reducedMotion()) return null
  return element.animate(keyframes, { easing: EASE, ...options })
}

// Board cards glide to their new place (FLIP): remember where every card is just before a change,
// then after the board re-renders, start each card at its old place and let it settle.
let remembered = null

export function rememberCardPositions() {
  if (typeof document === 'undefined') return
  remembered = {
    at: Date.now(),
    rects: new Map([...document.querySelectorAll('[data-task-id]')].map((node) => [node.dataset.taskId, node.getBoundingClientRect()])),
  }
}

export function playCardMoves(container) {
  const before = remembered
  if (!before || !container) return
  remembered = null
  // A change that never reached the board (for example a failed save) should not animate later.
  if (Date.now() - before.at > 4000) return
  for (const node of container.querySelectorAll('[data-task-id]')) {
    const previous = before.rects.get(node.dataset.taskId)
    if (!previous) {
      animate(node, [{ opacity: 0, transform: 'scale(0.96)' }, { opacity: 1, transform: 'none' }], { duration: 280 })
      continue
    }
    const now = node.getBoundingClientRect()
    const dx = previous.left - now.left
    const dy = previous.top - now.top
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue
    animate(node, [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: 380 })
  }
}

// A deleted card shrinks and fades before the board closes the gap.
export function fadeOutCard(taskId) {
  const node = document.querySelector(`[data-task-id="${taskId}"]`)
  return animate(node, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(0.96)' }], { duration: 200, fill: 'forwards' })
}
