// Makes everything on the page except `element` inert, so keyboard and screen reader users stay
// inside an overlay that covers the page (review M10). Returns a function that undoes it.
export function inertOthers(element) {
  const changed = []
  for (let node = element; node && node.parentElement && node !== document.body; node = node.parentElement) {
    for (const sibling of node.parentElement.children) {
      if (sibling === node || sibling.inert || sibling.tagName === 'SCRIPT') continue
      sibling.inert = true
      changed.push(sibling)
    }
  }
  return () => changed.forEach((node) => (node.inert = false))
}

// Phones and small tablets, where the chat and the sidebar cover the whole page.
export const COVERS_PAGE_QUERY = '(max-width: 1023.98px)'
