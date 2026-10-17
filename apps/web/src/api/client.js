// Sprint 1 screens run on sample data until the Express routes are merged.
// Each function here will become a fetch call to the documented endpoint.
// deleteTask must use fetch(..., { keepalive: true }): a delete waiting out its Undo time
// is sent when the page is left (Toast.jsx, pagehide), and a plain request is cancelled then.
//
// Sign-in (US-01, US-02) is real when VITE_API_URL and the Supabase settings are set
// (see apps/web/.env.example). Everything else stays on sample data for now; the
// signed-in user is shared with the sample data so those screens keep working.

import * as sample from './mockServer.js'
import * as realAuth from './realAuth.js'
import { useRealAuth } from './config.js'
import { apiFetch } from './realAuth.js'

const realProjects = {
  getProjects: () => apiFetch('/projects'),
  createProject: (input) =>
    apiFetch('/projects', { method: 'POST', body: input }),
  getProject: (projectId) => apiFetch(`/projects/${projectId}`),
}

const auth = useRealAuth
  ? {
      requestCode: realAuth.requestCode,
      verifyCode: realAuth.verifyCode,
      getMe: realAuth.getMe,
      setUsername: realAuth.setUsername,
      signOut: realAuth.signOut,
    }
  : {}

export const api = {
  ...sample,
  ...auth,
  ...(useRealAuth ? realProjects : {}),
}