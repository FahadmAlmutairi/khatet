// The page a signed-out user wanted, kept through the sign-in steps so they land back on it (review M1).
const KEY = 'khatet.returnTo'

function safePath(path) {
  return typeof path === 'string' && path.startsWith('/') && !path.startsWith('//') && !path.startsWith('/sign-in') ? path : null
}

export function rememberReturnTo(path) {
  const safe = safePath(path)
  if (!safe) return
  try {
    globalThis.sessionStorage?.setItem(KEY, safe)
  } catch {
    // Storage can be unavailable (private mode); the user then lands on the projects page.
  }
}

export function takeReturnTo(fallback = '/projects') {
  try {
    const path = safePath(globalThis.sessionStorage?.getItem(KEY))
    globalThis.sessionStorage?.removeItem(KEY)
    return path ?? fallback
  } catch {
    return fallback
  }
}
