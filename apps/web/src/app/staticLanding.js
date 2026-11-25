// The landing page is also rendered to plain HTML at build time (scripts/prerender.mjs) and
// placed in index.html as #landing-static, so search engines and link previews can read it
// without running JavaScript. Visitors see that copy at once; the app then takes its place.

const ID = 'landing-static'

export function hasStaticLanding() {
  return typeof document !== 'undefined' && Boolean(document.getElementById(ID))
}

export function removeStaticLanding() {
  if (typeof document !== 'undefined') document.getElementById(ID)?.remove()
}

// A saved Supabase sign-in means the visitor is about to be sent to their projects, so the
// landing copy should not show while their account loads.
export function hasSavedSession() {
  try {
    return Object.keys(localStorage).some((key) => key.startsWith('sb-') && key.endsWith('-auth-token'))
  } catch {
    return false
  }
}
