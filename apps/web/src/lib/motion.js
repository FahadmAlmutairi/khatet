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

// Board cards glide to their new place (FLIP): note where every card is drawn just before a
// change, then after the board re-renders, start each card at its old place and let it settle.
export function cardRects(root = document) {
  return new Map([...root.querySelectorAll('[data-task-id]')].map((node) => [node.dataset.taskId, node.getBoundingClientRect()]))
}

// During a drag the glide is added on top of the transform dnd-kit gives a card to make room
// (`add`); other moves replace it, as dnd-kit may animate the same change itself. A card caught
// mid-glide starts again from where it is drawn now, which is what `before` measured.
export function glideCards(root, before, { skip, enter = false, add = false } = {}) {
  if (!root || !before) return
  for (const node of root.querySelectorAll('[data-task-id]')) {
    const id = node.dataset.taskId
    if (id === skip) continue
    const previous = before.get(id)
    if (!previous) {
      if (enter) animate(node, [{ opacity: 0, transform: 'scale(0.96)' }, { opacity: 1, transform: 'none' }], { duration: 280 })
      continue
    }
    const running = node.getAnimations?.().filter((animation) => animation.id === 'card-glide') ?? []
    const now = node.getBoundingClientRect()
    const dx = previous.left - now.left
    const dy = previous.top - now.top
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue
    for (const animation of running) animation.cancel()
    // Cancelling moves the card to where it rests, so measure again before starting from the old place.
    const rest = running.length ? node.getBoundingClientRect() : now
    const glide = animate(
      node,
      [{ transform: `translate(${previous.left - rest.left}px, ${previous.top - rest.top}px)` }, { transform: 'translate(0, 0)' }],
      { duration: 380, composite: add ? 'add' : 'replace' },
    )
    if (glide) glide.id = 'card-glide'
  }
}

let remembered = null

export function rememberCardPositions() {
  if (typeof document === 'undefined') return
  remembered = { at: Date.now(), rects: cardRects(document) }
}

export function playCardMoves(container) {
  const before = remembered
  if (!before || !container) return
  remembered = null
  // A change that never reached the board (for example a failed save) should not animate later.
  if (Date.now() - before.at > 4000) return
  glideCards(container, before.rects, { enter: true })
}

// A deleted card shrinks and fades before the board closes the gap.
export function fadeOutCard(taskId) {
  const node = document.querySelector(`[data-task-id="${taskId}"]`)
  return animate(node, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(0.96)' }], { duration: 200, fill: 'forwards' })
}
