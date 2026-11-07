// Real sign-in (Supabase Auth + the Express API) is used when all three values are set:
// in apps/web/.env.local on your computer, or in Vercel's Environment Variables.
// Without them, and always in tests, the app runs on the sample data in mockServer.js.
const env = import.meta.env

export const apiUrl = (env.VITE_API_URL ?? '').replace(/\/+$/, '')
export const supabaseUrl = env.VITE_SUPABASE_URL
export const supabaseKey = env.VITE_SUPABASE_PUBLISHABLE_KEY

export const useRealAuth = Boolean(apiUrl && supabaseUrl && supabaseKey) && env.MODE !== 'test'

// Screens whose Express routes are not built yet. They work on sample data and stay hidden
// when the real API is on. Set an entry to true (or delete the check) once its route ships.
// memberRemoval: DELETE /api/projects/:projectId/members/:userId and POST /api/projects/:projectId/leave
// projectSettings: PATCH /api/projects/:projectId
export const apiReady = {
  memberRemoval: !useRealAuth,
  projectSettings: !useRealAuth,
}
