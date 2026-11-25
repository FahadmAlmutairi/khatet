import { useCallback, useSyncExternalStore } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import { setDemoSession } from '../../api/demoSession.js'
import { resetMockServer, startDemoServer } from '../../api/mockServer.js'

// The live demo opens the sample project "Khatet", owned by the sample user.
export const DEMO_PROJECT_ID = 'p-khatet'
export const DEMO_START = `/projects/${DEMO_PROJECT_ID}/overview`

const TOUR_KEY = 'khatet.tourStep'
const listeners = new Set()

function readTourStep() {
  try {
    const value = globalThis.sessionStorage?.getItem(TOUR_KEY)
    return value === null || value === undefined ? null : Number(value)
  } catch {
    return null
  }
}

let tourStep = readTourStep()

// The tour step survives page changes and reloads in this tab; null means the tour is closed.
export function setTourStep(step) {
  tourStep = step
  try {
    if (step === null) globalThis.sessionStorage?.removeItem(TOUR_KEY)
    else globalThis.sessionStorage?.setItem(TOUR_KEY, String(step))
  } catch {
    // Without storage the tour still works until the page reloads.
  }
  listeners.forEach((listener) => listener())
}

function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useTourStep() {
  return useSyncExternalStore(subscribe, () => tourStep, () => null)
}

// Starts the demo on fresh sample data with the tour at its first step.
export function startDemo(queryClient, { tour = true } = {}) {
  setDemoSession(true)
  startDemoServer()
  queryClient.clear()
  setTourStep(tour ? 0 : null)
}

// Leaves the demo: the sample data resets and the app asks the real server who is signed in again.
export function endDemo(queryClient) {
  setDemoSession(false)
  setTourStep(null)
  resetMockServer({ delay: 250 })
  queryClient.clear()
}

export function useLeaveDemo() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  return useCallback(
    (to = '/') => {
      endDemo(queryClient)
      navigate(to, { replace: true })
    },
    [queryClient, navigate],
  )
}
