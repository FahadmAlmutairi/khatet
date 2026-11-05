import { useEffect, useState } from 'react'

// How long a wait lasts before a slow-wait hint appears.
export const SLOW_AFTER_MS = 6000

// Shown when a request to the API takes long. The API runs on Render's free plan,
// which sleeps after 15 minutes without traffic and needs up to a minute to wake.
export const WAKING_UP = 'The server is starting up after being idle. This can take up to a minute.'

// True once `active` has stayed true for `delay` ms.
export function useTakingLong(active, delay = SLOW_AFTER_MS) {
  const [slow, setSlow] = useState(false)
  useEffect(() => {
    if (!active) return undefined
    const timer = setTimeout(() => setSlow(true), delay)
    return () => {
      clearTimeout(timer)
      setSlow(false)
    }
  }, [active, delay])
  return active && slow
}
