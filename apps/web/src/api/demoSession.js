// The live demo: a visitor without an account explores the real app on the sample data in
// mockServer.js. The flag lives in this tab's sessionStorage, so the demo survives a reload of
// a page but ends when the tab closes, and it never touches a real account or the real API.
const DEMO_KEY = 'khatet.demo'

export function isDemoSession() {
  try {
    return globalThis.sessionStorage?.getItem(DEMO_KEY) === '1'
  } catch {
    return false
  }
}

export function setDemoSession(on) {
  try {
    if (on) globalThis.sessionStorage?.setItem(DEMO_KEY, '1')
    else globalThis.sessionStorage?.removeItem(DEMO_KEY)
  } catch {
    // Storage can be unavailable (private mode); the demo then lasts until the page reloads.
  }
}

// The sample data was written around Monday 5 October 2026. In the demo every date moves by the
// same amount, so the newest message is a few minutes old and due dates fall around today: one
// task is overdue, one is blocked and the rest are due later this week, whatever the real date is.
const SAMPLE_NOW = Date.parse('2026-10-05T12:00:00Z')
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/
const TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/
const DAY_MS = 24 * 60 * 60 * 1000

function eachString(item, visit) {
  if (Array.isArray(item)) return item.map((entry) => eachString(entry, visit))
  if (item && typeof item === 'object') {
    return Object.fromEntries(Object.entries(item).map(([key, entry]) => [key, eachString(entry, visit)]))
  }
  return typeof item === 'string' ? visit(item) : item
}

export function shiftSampleDates(value, now = Date.now()) {
  const days = Math.round((now - SAMPLE_NOW) / DAY_MS)
  const dateShift = days * DAY_MS
  // Times move a little less when needed, so the newest one is ten minutes ago and none is in the future.
  let latest = -Infinity
  eachString(value, (text) => {
    if (TIMESTAMP.test(text)) latest = Math.max(latest, Date.parse(text))
    return text
  })
  const timeShift = Math.min(dateShift, now - 10 * 60 * 1000 - latest)
  return eachString(value, (text) => {
    if (DATE_ONLY.test(text)) return new Date(Date.parse(`${text}T00:00:00Z`) + dateShift).toISOString().slice(0, 10)
    if (TIMESTAMP.test(text)) return new Date(Date.parse(text) + timeShift).toISOString()
    return text
  })
}
