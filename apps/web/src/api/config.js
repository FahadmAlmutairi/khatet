// Real sign-in (Supabase Auth + the Express API) is used when all three values are set:
// in apps/web/.env.local on your computer, or in Vercel's Environment Variables.
// Without them, and always in tests, the app runs on the sample data in mockServer.js.
const env = import.meta.env

export const apiUrl = (env.VITE_API_URL ?? '').replace(/\/+$/, '')
export const supabaseUrl = env.VITE_SUPABASE_URL
export const supabaseKey = env.VITE_SUPABASE_PUBLISHABLE_KEY

export const useRealAuth = Boolean(apiUrl && supabaseUrl && supabaseKey) && env.MODE !== 'test'

// Screens whose Express routes may not be built yet. Shown on the live site by choice; until the
// route ships, the action shows the API's error. Set an entry to false to hide it again.
// chatSocket (TR-05): Socket.IO on the Express server (chat:join, message:new), apps/api/src/realtime/socket.js.
//   Chat goes back to the 3-second refresh whenever the socket drops or the room is refused.
// memberRemoval: DELETE /api/projects/:projectId/members/:userId and POST /api/projects/:projectId/leave
// projectSettings: PATCH /api/projects/:projectId
// aiReport (US-31): GET /api/projects/:projectId/reports/latest, GET and POST /api/projects/:projectId/reports.
//   The routes are on main (PR #28). Until OPENAI_API_KEY is on Render, Generate report shows
//   'The AI report is not set up on this server yet.'
// phases (US-20, Sprint 4, Mohammed): GET /api/projects/:projectId/phases and `phaseId` on each task
//   (docs/api-contract.md, Phases and timeline). Until it ships, the Timeline shows dated tasks only.
// reportSchedule (US-32, Sprint 4, Salman): GET and PATCH /api/projects/:projectId/report-schedule,
//   `trigger` on reports and REPORT_READY notifications (docs/api-contract.md, Automatic reports).
//   Until it ships, the Reports page hides the Automatic reports control.
// imports (US-33): POST /api/projects/:projectId/imports/preview and /imports/confirm. Off until the
//   whole dialog is merged (the preview, confirm and result steps come after upload and mapping).
export const apiReady = {
  chatSocket: true,
  memberRemoval: true,
  projectSettings: true,
  aiReport: true,
  phases: false,
  reportSchedule: false,
  imports: false,
}

// US-31: the AI report page shows on sample data, and on the live site once its routes are ready.
export const reportAvailable = apiReady.aiReport || !useRealAuth

// US-29: phases on the Timeline, from sample data or once GET /phases is on the live API.
export const phasesAvailable = apiReady.phases || !useRealAuth

// US-20 frontend (Abdulaziz): turn on once Project settings has its Phases section (id="phases"),
// so the Timeline's "Manage phases" link never opens a page without it.
export const phaseSettingsReady = false

// US-32: the Automatic reports control, on sample data or once the schedule routes are live.
export const reportScheduleAvailable = reportAvailable && (apiReady.reportSchedule || !useRealAuth)

// US-33: the owner's Import tasks button shows on sample data, and on the live site once ready.
export const importAvailable = apiReady.imports || !useRealAuth
