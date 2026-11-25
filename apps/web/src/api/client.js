// Sprint 1 screens run on sample data until the Express routes are merged.
// Each function here will become a fetch call to the documented endpoint.
// deleteTask must use fetch(..., { keepalive: true }): a delete waiting out its Undo time
// is sent when the page is left (Toast.jsx, pagehide), and a plain request is cancelled then.
//
// Sign-in (US-01, US-02) is real when VITE_API_URL and the Supabase settings are set
// (see apps/web/.env.example). Projects, members, invitations, notifications and
// tasks then use the Express API too. Everything else stays on sample data for now; the
// signed-in user is shared with the sample data so those screens keep working.

import * as sample from './mockServer.js'
import * as realAuth from './realAuth.js'
import { useRealAuth } from './config.js'
import { isDemoSession } from './demoSession.js'
import { apiFetch } from './realAuth.js'

const realProjects = {
  getProjects: () => apiFetch('/projects'),
  createProject: (input) =>
    apiFetch('/projects', { method: 'POST', body: input }),
  getProject: (projectId) => apiFetch(`/projects/${projectId}`),
  updateProject: (projectId, patch) =>
    apiFetch(`/projects/${projectId}`, { method: 'PATCH', body: patch }),
  // Archived projects: the owner archives; each member keeps the log until they delete it.
  archiveProject: (projectId) => apiFetch(`/projects/${projectId}/archive`, { method: 'POST' }),
  // US-27: delete everything now, for every member, without archiving first.
  deleteProject: (projectId) => apiFetch(`/projects/${projectId}`, { method: 'DELETE' }),
  getArchivedProjects: () => apiFetch('/archived-projects'),
  getArchivedProject: (projectId) => apiFetch(`/archived-projects/${projectId}`),
  deleteArchivedProject: (projectId) => apiFetch(`/archived-projects/${projectId}`, { method: 'DELETE' }),
  restoreProject: (projectId) => apiFetch(`/archived-projects/${projectId}/restore`, { method: 'POST' }),
}

// US-07 to US-10, US-13, US-21, US-24 and US-30.
const realMembersAndNotifications = {
  getMembers: (projectId) => apiFetch(`/projects/${projectId}/members`),
  updateMemberAccess: (projectId, userId, taskAccess) =>
    apiFetch(`/projects/${projectId}/members/${userId}`, { method: 'PATCH', body: { taskAccess } }),
  removeMember: (projectId, userId) =>
    apiFetch(`/projects/${projectId}/members/${userId}`, { method: 'DELETE' }),
  leaveProject: (projectId) => apiFetch(`/projects/${projectId}/leave`, { method: 'POST' }),
  inviteMember: (projectId, username) =>
    apiFetch(`/projects/${projectId}/invitations`, { method: 'POST', body: { username } }),
  cancelInvitation: (projectId, invitationId) =>
    apiFetch(`/projects/${projectId}/invitations/${invitationId}`, { method: 'DELETE' }),
  acceptInvitation: (invitationId) => apiFetch(`/invitations/${invitationId}/accept`, { method: 'POST' }),
  declineInvitation: (invitationId) => apiFetch(`/invitations/${invitationId}/decline`, { method: 'POST' }),
  getNotifications: () => apiFetch('/notifications'),
  // US-13 to US-18 and US-21: the board's task list, and creating, opening, editing, moving
  // and deleting tasks.
  getTasks: (projectId) => apiFetch(`/projects/${projectId}/tasks`),
  createTask: (projectId, input) => apiFetch(`/projects/${projectId}/tasks`, { method: 'POST', body: input }),
  getTask: (taskId) => apiFetch(`/tasks/${taskId}`),
  updateTask: (taskId, patch) => apiFetch(`/tasks/${taskId}`, { method: 'PATCH', body: patch }),
  moveTask: (taskId, { status, position }) =>
    apiFetch(`/tasks/${taskId}/move`, { method: 'POST', body: { status, position } }),
  deleteTask: (taskId) => apiFetch(`/tasks/${taskId}`, { method: 'DELETE', keepalive: true }),
  markNotificationRead: (notificationId) =>
    apiFetch(`/notifications/${notificationId}`, { method: 'PATCH', body: { read: true } }),
  // US-24: project chat, refreshed with the `after` cursor.
  getMessages: (projectId, { after } = {}) =>
    apiFetch(`/projects/${projectId}/messages${after ? `?after=${encodeURIComponent(after)}` : ''}`),
  sendMessage: (projectId, text) => apiFetch(`/projects/${projectId}/messages`, { method: 'POST', body: { text } }),
}

// US-31: the AI report. Only used once apiReady.aiReport is on; until then the page is hidden.
const realReports = {
  getLatestReport: (projectId) => apiFetch(`/projects/${projectId}/reports/latest`),
  getReports: (projectId) => apiFetch(`/projects/${projectId}/reports`),
  generateReport: (projectId) => apiFetch(`/projects/${projectId}/reports`, { method: 'POST' }),
}

// US-33: CSV import (docs/api-contract.md, Import contract). The file's text goes inside JSON.
const realImports = {
  previewImport: (projectId, { csv, mapping }) =>
    apiFetch(`/projects/${projectId}/imports/preview`, { method: 'POST', body: mapping === undefined ? { csv } : { csv, mapping } }),
  confirmImport: (projectId, { csv, mapping }) =>
    apiFetch(`/projects/${projectId}/imports/confirm`, { method: 'POST', body: { csv, mapping } }),
}

// The project log (docs/api-contract.md, Project log).
const realActivity = {
  getActivity: (projectId, { actorId, taskId, kind, before } = {}) => {
    const query = new URLSearchParams()
    if (actorId) query.set('actorId', actorId)
    if (taskId) query.set('taskId', taskId)
    if (kind) query.set('kind', kind)
    if (before) query.set('before', before)
    const suffix = query.size ? `?${query}` : ''
    return apiFetch(`/projects/${projectId}/activity${suffix}`)
  },
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

const live = {
  ...sample,
  ...auth,
  ...(useRealAuth ? { ...realProjects, ...realMembersAndNotifications, ...realReports, ...realActivity, ...realImports } : {}),
}

// The live demo (demoSession.js) runs every call on the sample data, even on the live site, so a
// visitor can try the real screens without an account and nothing reaches the real API.
export const api = useRealAuth
  ? Object.fromEntries(Object.keys(live).map((name) => [name, (...args) => (isDemoSession() ? sample : live)[name](...args)]))
  : live
