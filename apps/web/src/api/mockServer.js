// In-memory stand-in for the Express API so the Sprint 1 screens can be built and
// reviewed before the backend routes exist. It applies the same permission rules as
// docs/api-contract.md so the screens show the right states, but the real checks
// belong to the backend. Data resets when the page reloads.
import { formatDueDate } from '../lib/domain.js'
import { ApiError } from './errors.js'
import { createSampleData } from './sampleData.js'

const SESSION_KEY = 'khatet.sampleSession'
const STATUS_ORDER = ['BACKLOG', 'TODO', 'IN_PROGRESS', 'READY_FOR_REVIEW', 'DONE']
const PRIORITY_VALUES = ['LOW', 'MEDIUM', 'HIGH']
const ACCESS_VALUES = ['VIEW_ONLY', 'EDIT_ASSIGNED', 'EDIT_ALL']

let db = createSampleData()
let currentUserId = readSession()
let pendingEmail = null
let delayMs = 250
let idCounter = 0

const USERNAME_CHANGE_INTERVAL_MS = 30 * 24 * 60 * 60 * 1000

export function resetMockServer({ signedInAs = null, delay = 0 } = {}) {
  db = createSampleData()
  currentUserId = signedInAs
  pendingEmail = null
  delayMs = delay
  writeSession(signedInAs)
}

// Lets tests and reviewers make the next call to `name` fail once.
const failures = new Map()
export function failNextCall(name, error) {
  failures.set(name, error)
}

function readSession() {
  try {
    return globalThis.sessionStorage?.getItem(SESSION_KEY) ?? null
  } catch {
    return null
  }
}

function writeSession(userId) {
  try {
    if (userId) globalThis.sessionStorage?.setItem(SESSION_KEY, userId)
    else globalThis.sessionStorage?.removeItem(SESSION_KEY)
  } catch {
    // Storage can be unavailable (private mode); the session then lasts until reload.
  }
}

function respond(name, work) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const failure = failures.get(name)
      if (failure) {
        failures.delete(name)
        reject(failure)
        return
      }
      try {
        resolve(structuredClone(work()))
      } catch (error) {
        reject(error)
      }
    }, delayMs)
  })
}

function newId(prefix) {
  idCounter += 1
  return `${prefix}-${Date.now().toString(36)}-${idCounter}`
}

function now() {
  return new Date().toISOString()
}

function invalid(fieldErrors, message = 'Check the highlighted fields.') {
  return new ApiError({ code: 'VALIDATION_FAILED', status: 422, message, fieldErrors })
}

function forbidden(message) {
  return new ApiError({ code: 'FORBIDDEN', status: 403, message })
}

function notFound(message) {
  return new ApiError({ code: 'NOT_FOUND', status: 404, message })
}

function requireUser() {
  const user = db.users.find((item) => item.id === currentUserId)
  if (!user) {
    throw new ApiError({ code: 'UNAUTHENTICATED', status: 401, message: 'Your session has ended. Sign in again.' })
  }
  return user
}

// A user can open only the projects they belong to (NFR-11).
// An archived project answers 410 PROJECT_ARCHIVED except for its log ({ allowArchived: true }).
function requireMembership(projectId, { allowArchived = false } = {}) {
  const user = requireUser()
  const membership = db.members.find((item) => item.projectId === projectId && item.userId === user.id)
  if (!membership || membership.archiveRemovedAt) throw notFound('This project does not exist or you are not a member of it.')
  if (db.projects.find((p) => p.id === projectId)?.archivedAt && !allowArchived) throw archivedError()
  return membership
}

function archivedError() {
  return new ApiError({
    code: 'PROJECT_ARCHIVED',
    status: 410,
    message: 'This project is archived. Its project log is in Settings, under Archived projects.',
  })
}

function usernameOf(userId) {
  return db.users.find((user) => user.id === userId)?.username ?? 'unknown'
}

// The project log: one entry per change, kept after the task is deleted or the member leaves.
function logActivity(projectId, type, { task = null, details = {} } = {}) {
  db.activity.push({
    id: newId('a'),
    projectId,
    actorId: currentUserId,
    actorUsername: usernameOf(currentUserId),
    type,
    taskId: task?.id ?? null,
    taskTitle: task?.title ?? null,
    details,
    createdAt: now(),
  })
}

function canEditAll(membership) {
  return membership.role === 'OWNER' || membership.taskAccess === 'EDIT_ALL'
}

function taskPermissions(task, membership) {
  const assigned = task.assigneeIds.includes(membership.userId)
  const canEdit = canEditAll(membership) || (membership.taskAccess === 'EDIT_ASSIGNED' && assigned)
  return { canEdit, canMove: canEdit, canDelete: canEditAll(membership) }
}

function withPermissions(task, membership) {
  return { ...task, permissions: taskPermissions(task, membership) }
}

function projectTasks(projectId) {
  return db.tasks
    .filter((task) => task.projectId === projectId)
    .sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) || a.position - b.position)
}

function columnTasks(projectId, status, exceptId) {
  return projectTasks(projectId).filter((task) => task.status === status && task.id !== exceptId)
}

function renumber(tasks) {
  tasks.forEach((task, index) => {
    task.position = index + 1
  })
}

function notifyAssignees(task, userIds) {
  for (const userId of userIds) {
    if (userId === currentUserId) continue
    db.notifications.push({
      id: newId('n'),
      userId,
      type: 'TASK_ASSIGNED',
      taskId: task.id,
      projectId: task.projectId,
      actorId: currentUserId,
      read: false,
      createdAt: now(),
    })
  }
}

function validateTaskFields(input, projectId, { partial }) {
  const errors = []
  const clean = {}

  if (!partial || 'title' in input) {
    const title = (input.title ?? '').trim()
    if (!title) errors.push({ field: 'title', message: 'Enter a task title.' })
    else if (title.length > 200) errors.push({ field: 'title', message: 'Keep the title under 200 characters.' })
    clean.title = title
  }
  if (!partial || 'assigneeIds' in input) {
    const ids = [...new Set(input.assigneeIds ?? [])]
    const memberIds = db.members.filter((item) => item.projectId === projectId).map((item) => item.userId)
    if (ids.length === 0) errors.push({ field: 'assigneeIds', message: 'Choose at least one assignee.' })
    else if (ids.some((id) => !memberIds.includes(id))) {
      errors.push({ field: 'assigneeIds', message: 'Assignees must be members of this project.' })
    }
    clean.assigneeIds = ids
  }
  if ('description' in input) clean.description = (input.description ?? '').trim()
  if ('priority' in input) {
    const priority = input.priority || null
    if (priority && !PRIORITY_VALUES.includes(priority)) errors.push({ field: 'priority', message: 'Choose a priority.' })
    clean.priority = priority
  }
  if ('dueDate' in input) {
    const dueDate = input.dueDate || null
    if (dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) errors.push({ field: 'dueDate', message: 'Enter a valid date.' })
    clean.dueDate = dueDate
  }

  if (errors.length) throw invalid(errors)
  return clean
}

// ---------- Authentication (US-01, US-02) ----------

export function requestCode(email) {
  return respond('requestCode', () => {
    const value = (email ?? '').trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      throw invalid([{ field: 'email', message: 'Enter an email address, for example name@example.com.' }])
    }
    pendingEmail = value
    return { email: value }
  })
}

// Sample codes: 000000 is wrong and 111111 has expired; any other 6 digits work.
export function verifyCode(code) {
  return respond('verifyCode', () => {
    if (!pendingEmail) {
      throw new ApiError({ code: 'CODE_NOT_REQUESTED', message: 'Request a code first.' })
    }
    if (!/^\d{6}$/.test(code ?? '')) throw invalid([{ field: 'code', message: 'Enter the 6-digit code.' }])
    if (code === '000000') {
      throw invalid([{ field: 'code', message: 'That code is not right. Check the email and try again.' }])
    }
    if (code === '111111') {
      throw invalid([{ field: 'code', message: 'This code has expired. Request a new code.' }])
    }
    let user = db.users.find((item) => item.email === pendingEmail)
    if (!user) {
      user = { id: newId('u'), email: pendingEmail, username: null }
      db.users.push(user)
    }
    currentUserId = user.id
    pendingEmail = null
    writeSession(user.id)
    return user
  })
}

export function getMe() {
  return respond('getMe', () => db.users.find((user) => user.id === currentUserId) ?? null)
}

export function setUsername(username) {
  return respond('setUsername', () => {
    const user = requireUser()
    const value = (username ?? '').trim().replace(/^@/, '').toLowerCase()
    if (!/^[a-z0-9_]{3,20}$/.test(value)) {
      throw invalid([{ field: 'username', message: 'Use 3 to 20 letters, numbers or underscores.' }])
    }
    // A username can change once every 30 days (US-03); choosing the first one starts the clock too (SEC-03).
    if (user.username && user.usernameChangeableAt && Date.now() < new Date(user.usernameChangeableAt).getTime()) {
      throw invalid([{ field: 'username', message: 'You can change your username once every 30 days.' }])
    }
    if (db.users.some((item) => item.username === value && item.id !== user.id)) {
      throw invalid([{ field: 'username', message: `${value} is taken. Try another username.` }])
    }
    user.usernameChangeableAt = new Date(Date.now() + USERNAME_CHANGE_INTERVAL_MS).toISOString()
    user.username = value
    return user
  })
}

// Real sign-in (realAuth.js) shares its user with the sample data, so the screens
// that still run on sample data (projects, tasks, members) work for that user.
export function adoptUser(user) {
  if (!user) {
    currentUserId = null
    writeSession(null)
    return
  }
  const existing = db.users.find((item) => item.id === user.id)
  if (existing) Object.assign(existing, user)
  else db.users.push({ id: user.id, email: user.email, username: user.username })
  currentUserId = user.id
  writeSession(user.id)
}

export function signOut() {
  return respond('signOut', () => {
    currentUserId = null
    writeSession(null)
    return null
  })
}

// ---------- Projects (US-04, US-05, US-06) ----------

function serializeProject(project, membership) {
  return {
    ...project,
    role: membership.role,
    taskAccess: membership.taskAccess,
    permissions: {
      canCreateTask: canEditAll(membership),
      canManageMembers: membership.role === 'OWNER',
    },
  }
}

export function getProjects() {
  return respond('getProjects', () => {
    const user = requireUser()
    return db.members
      .filter((item) => item.userId === user.id && !db.projects.find((p) => p.id === item.projectId)?.archivedAt)
      .map((membership) => serializeProject(db.projects.find((p) => p.id === membership.projectId), membership))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  })
}

export function createProject({ name, description }) {
  return respond('createProject', () => {
    const user = requireUser()
    const cleanName = (name ?? '').trim()
    if (!cleanName) throw invalid([{ field: 'name', message: 'Enter a project name.' }])
    const project = { id: newId('p'), name: cleanName, description: (description ?? '').trim(), createdAt: now() }
    const membership = { projectId: project.id, userId: user.id, role: 'OWNER', taskAccess: 'EDIT_ALL' }
    db.projects.push(project)
    db.members.push(membership)
    logActivity(project.id, 'PROJECT_CREATED', { details: { name: cleanName } })
    return serializeProject(project, membership)
  })
}

export function getProject(projectId) {
  return respond('getProject', () => {
    const membership = requireMembership(projectId)
    return serializeProject(
      db.projects.find((p) => p.id === projectId),
      membership,
    )
  })
}

export function updateProject(projectId, patch) {
  return respond('updateProject', () => {
    const membership = requireMembership(projectId)
    if (membership.role !== 'OWNER') {
      throw forbidden('Only the project owner can update project settings.')
    }

    const errors = []
    const updates = {}
    if ('name' in patch) {
      if (typeof patch.name !== 'string' || !patch.name.trim()) {
        errors.push({ field: 'name', message: 'Enter a project name.' })
      } else if (patch.name.trim().length > 200) {
        errors.push({ field: 'name', message: 'Keep the project name under 200 characters.' })
      } else {
        updates.name = patch.name.trim()
      }
    }
    if ('description' in patch) {
      if (typeof patch.description !== 'string') {
        errors.push({ field: 'description', message: 'Enter a project description.' })
      } else {
        updates.description = patch.description.trim()
      }
    }
    if (errors.length) throw invalid(errors)

    const project = db.projects.find((item) => item.id === projectId)
    const changes = []
    if (updates.name !== undefined && updates.name !== project.name) changes.push({ field: 'name', from: project.name, to: updates.name })
    if (updates.description !== undefined && updates.description !== project.description) changes.push({ field: 'description' })
    Object.assign(project, updates, { updatedAt: now() })
    if (changes.length) logActivity(projectId, 'PROJECT_UPDATED', { details: { changes } })
    return serializeProject(project, membership)
  })
}

// ---------- Archived projects ----------

const TASK_STATUSES = ['BACKLOG', 'TODO', 'IN_PROGRESS', 'READY_FOR_REVIEW', 'DONE']

function serializeArchived(project, membership) {
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    createdAt: project.createdAt,
    archivedAt: project.archivedAt,
    archivedByUsername: usernameOf(project.archivedById),
    role: membership.role,
    summary: project.archiveSummary,
  }
}

export function archiveProject(projectId) {
  return respond('archiveProject', () => {
    const membership = requireMembership(projectId)
    if (membership.role !== 'OWNER') throw forbidden('Only the project owner can archive the project.')
    const project = db.projects.find((item) => item.id === projectId)
    const byStatus = Object.fromEntries(TASK_STATUSES.map((status) => [status, 0]))
    const tasks = db.tasks.filter((task) => task.projectId === projectId)
    for (const task of tasks) byStatus[task.status] += 1
    logActivity(projectId, 'PROJECT_ARCHIVED', { details: { name: project.name } })
    Object.assign(project, {
      archivedAt: now(),
      archivedById: membership.userId,
      archiveSummary: {
        name: project.name,
        description: project.description,
        createdAt: project.createdAt,
        members: db.members
          .filter((item) => item.projectId === projectId)
          .map((item) => ({ userId: item.userId, username: usernameOf(item.userId), role: item.role })),
        tasks: { total: tasks.length, byStatus },
      },
    })
    db.invitations = db.invitations.filter((item) => !(item.projectId === projectId && item.status === 'PENDING'))
    db.notifications = db.notifications.filter((item) => item.projectId !== projectId)
    return serializeArchived(project, membership)
  })
}

// US-27: the owner deletes the project and everything in it, for every member.
export function deleteProject(projectId) {
  return respond('deleteProject', () => {
    const membership = requireMembership(projectId)
    if (membership.role !== 'OWNER') throw forbidden('Only the project owner can delete the project.')
    db.projects = db.projects.filter((item) => item.id !== projectId)
    for (const key of ['members', 'invitations', 'tasks', 'activity', 'messages', 'reports', 'notifications']) {
      db[key] = db[key].filter((item) => item.projectId !== projectId)
    }
    return null
  })
}

function requireArchived(projectId) {
  const user = requireUser()
  const membership = db.members.find((item) => item.projectId === projectId && item.userId === user.id)
  const project = db.projects.find((item) => item.id === projectId)
  if (!membership || membership.archiveRemovedAt || !project?.archivedAt) {
    throw notFound('This archived project does not exist or you deleted it.')
  }
  return { membership, project }
}

export function getArchivedProjects() {
  return respond('getArchivedProjects', () => {
    const user = requireUser()
    return db.members
      .filter((item) => item.userId === user.id && !item.archiveRemovedAt)
      .map((membership) => [db.projects.find((p) => p.id === membership.projectId), membership])
      .filter(([project]) => project?.archivedAt)
      .map(([project, membership]) => serializeArchived(project, membership))
      .sort((a, b) => b.archivedAt.localeCompare(a.archivedAt))
  })
}

export function getArchivedProject(projectId) {
  return respond('getArchivedProject', () => {
    const { project, membership } = requireArchived(projectId)
    return serializeArchived(project, membership)
  })
}

export function deleteArchivedProject(projectId) {
  return respond('deleteArchivedProject', () => {
    const { membership } = requireArchived(projectId)
    membership.archiveRemovedAt = now()
    const keeping = db.members.some((item) => item.projectId === projectId && !item.archiveRemovedAt)
    if (!keeping) {
      db.projects = db.projects.filter((item) => item.id !== projectId)
      db.members = db.members.filter((item) => item.projectId !== projectId)
      db.activity = db.activity.filter((item) => item.projectId !== projectId)
      db.tasks = db.tasks.filter((item) => item.projectId !== projectId)
    }
    return null
  })
}

export function restoreProject(projectId) {
  return respond('restoreProject', () => {
    const { project, membership } = requireArchived(projectId)
    if (membership.role !== 'OWNER') throw forbidden('Only the project owner can restore the project.')
    for (const item of db.members) if (item.projectId === projectId) delete item.archiveRemovedAt
    logActivity(projectId, 'PROJECT_RESTORED', { details: { name: project.name } })
    Object.assign(project, { archivedAt: null, archivedById: null, archiveSummary: null })
    return { id: project.id, name: project.name }
  })
}

// ---------- Members and invitations (US-07, US-08, US-09, US-10) ----------

export function getMembers(projectId) {
  return respond('getMembers', () => {
    const membership = requireMembership(projectId)
    const members = db.members
      .filter((item) => item.projectId === projectId)
      .map((item) => ({ ...item, username: usernameOf(item.userId) }))
      .sort((a, b) => (a.role === 'OWNER' ? -1 : b.role === 'OWNER' ? 1 : a.username.localeCompare(b.username)))
    const invitations =
      membership.role === 'OWNER'
        ? db.invitations
            .filter((item) => item.projectId === projectId && item.status === 'PENDING')
            .map((item) => ({ id: item.id, username: usernameOf(item.invitedUserId), createdAt: item.createdAt }))
        : []
    return { members, invitations }
  })
}

export function updateMemberAccess(projectId, userId, taskAccess) {
  return respond('updateMemberAccess', () => {
    const membership = requireMembership(projectId)
    if (membership.role !== 'OWNER') throw forbidden('Only the project owner can change task access.')
    if (!ACCESS_VALUES.includes(taskAccess)) throw invalid([{ field: 'taskAccess', message: 'Choose an access level.' }])
    const target = db.members.find((item) => item.projectId === projectId && item.userId === userId)
    if (!target || target.role === 'OWNER') throw notFound('This member is no longer in the project.')
    if (target.taskAccess !== taskAccess) {
      logActivity(projectId, 'MEMBER_ACCESS_CHANGED', {
        details: { userId, username: usernameOf(userId), from: target.taskAccess, to: taskAccess },
      })
    }
    target.taskAccess = taskAccess
    return { ...target, username: usernameOf(userId) }
  })
}

export function removeMember(projectId, userId) {
  return respond('removeMember', () => {
    const membership = requireMembership(projectId)
    if (membership.role !== 'OWNER') throw forbidden('Only the project owner can remove members.')
    const target = db.members.find((item) => item.projectId === projectId && item.userId === userId)
    if (!target || target.role === 'OWNER') throw notFound('This member is no longer in the project.')
    db.members = db.members.filter((item) => item !== target)
    logActivity(projectId, 'MEMBER_REMOVED', { details: { userId, username: usernameOf(userId) } })
    return { projectId, userId }
  })
}

export function leaveProject(projectId) {
  return respond('leaveProject', () => {
    const membership = requireMembership(projectId)
    if (membership.role === 'OWNER') throw forbidden('The project owner cannot leave their own project.')
    db.members = db.members.filter((item) => item !== membership)
    logActivity(projectId, 'MEMBER_LEFT')
    return { projectId, userId: membership.userId }
  })
}

export function cancelInvitation(projectId, invitationId) {
  return respond('cancelInvitation', () => {
    const membership = requireMembership(projectId)
    if (membership.role !== 'OWNER') throw forbidden('Only the project owner can cancel invitations.')
    const index = db.invitations.findIndex((item) => item.id === invitationId && item.projectId === projectId && item.status === 'PENDING')
    if (index < 0) throw notFound('This invitation is no longer pending.')
    const [cancelled] = db.invitations.splice(index, 1)
    logActivity(projectId, 'INVITATION_CANCELLED', {
      details: { userId: cancelled.invitedUserId, username: usernameOf(cancelled.invitedUserId) },
    })
    db.notifications = db.notifications.filter((item) => item.invitationId !== invitationId)
    return null
  })
}

export function inviteMember(projectId, username) {
  return respond('inviteMember', () => {
    const membership = requireMembership(projectId)
    if (membership.role !== 'OWNER') throw forbidden('Only the project owner can invite members.')
    const value = (username ?? '').trim().replace(/^@/, '').toLowerCase()
    if (!value) throw invalid([{ field: 'username', message: 'Enter a username.' }])
    // SEC-02: the same answer for every refused case, as on the API.
    const cannotInvite = () =>
      invalid([
        {
          field: 'username',
          message: `${value} cannot be invited. Check the spelling. Members and people already invited are not invited again.`,
        },
      ])
    const user = db.users.find((item) => item.username === value)
    if (!user) throw cannotInvite()
    if (db.members.some((item) => item.projectId === projectId && item.userId === user.id)) throw cannotInvite()
    if (db.invitations.some((item) => item.projectId === projectId && item.invitedUserId === user.id && item.status === 'PENDING')) {
      throw cannotInvite()
    }
    const invitation = {
      id: newId('inv'),
      projectId,
      invitedUserId: user.id,
      invitedById: currentUserId,
      status: 'PENDING',
      createdAt: now(),
    }
    db.invitations.push(invitation)
    db.notifications.push({
      id: newId('n'),
      userId: user.id,
      type: 'INVITATION',
      invitationId: invitation.id,
      projectId,
      actorId: currentUserId,
      read: false,
      createdAt: invitation.createdAt,
    })
    logActivity(projectId, 'MEMBER_INVITED', { details: { userId: user.id, username: value } })
    return { id: invitation.id, username: value, createdAt: invitation.createdAt }
  })
}

function respondToInvitation(name, invitationId, accept) {
  return respond(name, () => {
    const user = requireUser()
    const invitation = db.invitations.find((item) => item.id === invitationId && item.invitedUserId === user.id)
    if (!invitation || invitation.status !== 'PENDING') throw notFound('This invitation is no longer available.')
    invitation.status = accept ? 'ACCEPTED' : 'DECLINED'
    if (accept) {
      db.members.push({ projectId: invitation.projectId, userId: user.id, role: 'MEMBER', taskAccess: 'EDIT_ASSIGNED' })
    }
    for (const notification of db.notifications) {
      if (notification.invitationId === invitationId) notification.read = true
    }
    logActivity(invitation.projectId, accept ? 'MEMBER_JOINED' : 'INVITATION_DECLINED')
    return { id: invitation.id, status: invitation.status, projectId: invitation.projectId }
  })
}

export function acceptInvitation(invitationId) {
  return respondToInvitation('acceptInvitation', invitationId, true)
}

export function declineInvitation(invitationId) {
  return respondToInvitation('declineInvitation', invitationId, false)
}

// ---------- Tasks (US-13 to US-18, US-21) ----------

export function getTasks(projectId) {
  return respond('getTasks', () => {
    const membership = requireMembership(projectId)
    return projectTasks(projectId).map((task) => withPermissions(task, membership))
  })
}

function findTask(taskId) {
  const task = db.tasks.find((item) => item.id === taskId)
  if (!task) throw notFound('This task no longer exists. It may have been deleted.')
  return { task, membership: requireMembership(task.projectId) }
}

export function getTask(taskId) {
  return respond('getTask', () => {
    const { task, membership } = findTask(taskId)
    return withPermissions(task, membership)
  })
}

export function createTask(projectId, input) {
  return respond('createTask', () => {
    const membership = requireMembership(projectId)
    if (!canEditAll(membership)) throw forbidden('You need Edit all tasks access to create tasks.')
    const fields = validateTaskFields(input, projectId, { partial: false })
    const task = {
      id: newId('t'),
      projectId,
      description: '',
      priority: null,
      dueDate: null,
      ...fields,
      status: 'TODO',
      position: columnTasks(projectId, 'TODO').length + 1,
      isBlocked: false,
      blockedReason: null,
      createdById: membership.userId,
      createdAt: now(),
      updatedAt: now(),
    }
    db.tasks.push(task)
    notifyAssignees(task, task.assigneeIds)
    logActivity(projectId, 'TASK_CREATED', { task, details: { status: 'TODO', assignees: task.assigneeIds.map(usernameOf) } })
    return withPermissions(task, membership)
  })
}

export function updateTask(taskId, patch) {
  return respond('updateTask', () => {
    const { task, membership } = findTask(taskId)
    if (!taskPermissions(task, membership).canEdit) throw forbidden('You do not have access to edit this task.')
    const fields = validateTaskFields(patch, task.projectId, { partial: true })
    if ('isBlocked' in patch) {
      if (patch.isBlocked && task.status !== 'IN_PROGRESS') {
        throw invalid([{ field: 'isBlocked', message: 'Only tasks in progress can be flagged as blocked.' }])
      }
      fields.isBlocked = Boolean(patch.isBlocked)
      fields.blockedReason = patch.isBlocked ? (patch.blockedReason ?? '').trim() || null : null
    }
    const added = (fields.assigneeIds ?? []).filter((id) => !task.assigneeIds.includes(id))
    const before = { ...task }
    Object.assign(task, fields, { updatedAt: now() })
    notifyAssignees(task, added)
    const changes = describeChanges(before, task)
    if (changes.length) logActivity(task.projectId, 'TASK_UPDATED', { task, details: { changes } })
    return withPermissions(task, membership)
  })
}

// Same shape as the API's project log (apps/api/src/tasks/routes.js, describeChanges).
function describeChanges(before, after) {
  const changes = []
  for (const field of ['title', 'priority', 'dueDate', 'isBlocked']) {
    if (before[field] !== after[field]) changes.push({ field, from: before[field], to: after[field] })
  }
  if (after.isBlocked && before.blockedReason !== after.blockedReason) {
    changes.push({ field: 'blockedReason', from: before.blockedReason, to: after.blockedReason })
  }
  if (before.description !== after.description) changes.push({ field: 'description' })
  const added = after.assigneeIds.filter((id) => !before.assigneeIds.includes(id))
  const removed = before.assigneeIds.filter((id) => !after.assigneeIds.includes(id))
  if (added.length || removed.length) {
    changes.push({ field: 'assignees', added: added.map(usernameOf), removed: removed.map(usernameOf) })
  }
  return changes
}

// Whole-number positions per column: the server shifts the other cards (decided 5 Oct 2026).
export function moveTask(taskId, { status, position }) {
  return respond('moveTask', () => {
    const { task, membership } = findTask(taskId)
    if (!taskPermissions(task, membership).canMove) throw forbidden('You do not have access to move this task.')
    if (!STATUS_ORDER.includes(status)) throw invalid([{ field: 'status', message: 'Choose a status.' }])

    const source = columnTasks(task.projectId, task.status, task.id)
    const target = status === task.status ? source : columnTasks(task.projectId, status, task.id)
    const index = Math.min(Math.max((position ?? target.length + 1) - 1, 0), target.length)
    target.splice(index, 0, task)

    if (status !== task.status) logActivity(task.projectId, 'TASK_MOVED', { task, details: { from: task.status, to: status } })
    task.status = status
    if (status !== 'IN_PROGRESS') {
      task.isBlocked = false
      task.blockedReason = null
    }
    task.updatedAt = now()
    renumber(source)
    renumber(target)
    return projectTasks(task.projectId).map((item) => withPermissions(item, membership))
  })
}

export function deleteTask(taskId) {
  return respond('deleteTask', () => {
    const { task, membership } = findTask(taskId)
    if (!taskPermissions(task, membership).canDelete) throw forbidden('You need Edit all tasks access to delete tasks.')
    db.tasks = db.tasks.filter((item) => item.id !== taskId)
    logActivity(task.projectId, 'TASK_DELETED', { task, details: { status: task.status } })
    renumber(columnTasks(task.projectId, task.status))
    return { id: taskId }
  })
}

// ---------- Notifications (US-30) ----------

export function getNotifications() {
  return respond('getNotifications', () => {
    const user = requireUser()
    const items = db.notifications
      .filter((item) => item.userId === user.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((item) => ({
        ...item,
        actorUsername: usernameOf(item.actorId),
        projectName: db.projects.find((p) => p.id === item.projectId)?.name ?? 'a project',
        taskTitle: item.taskId ? (db.tasks.find((t) => t.id === item.taskId)?.title ?? null) : null,
        invitationStatus: item.invitationId
          ? (db.invitations.find((inv) => inv.id === item.invitationId)?.status ?? 'DECLINED')
          : null,
      }))
    return { items, unreadCount: items.filter((item) => !item.read).length }
  })
}

export function markNotificationRead(notificationId) {
  return respond('markNotificationRead', () => {
    const user = requireUser()
    const notification = db.notifications.find((item) => item.id === notificationId && item.userId === user.id)
    if (!notification) throw notFound('This notification no longer exists.')
    notification.read = true
    return notification
  })
}

// ---------- Project chat (US-24) ----------

export const MAX_MESSAGE_LENGTH = 2000
const MESSAGE_LIST_LIMIT = 100

// US-25: a task is mentioned as #[task:<taskId>]. Each message lists the tasks it mentions with
// their current title, or a null title once the task is deleted.
const TASK_TOKEN = /#\[task:([^\]\s]+)\]/g

function referencedTaskIds(text) {
  return [...new Set([...text.matchAll(TASK_TOKEN)].map((match) => match[1]))]
}

function serializeMessage(message) {
  return {
    ...message,
    authorUsername: usernameOf(message.authorId),
    references: referencedTaskIds(message.text).map((taskId) => ({
      taskId,
      title: db.tasks.find((task) => task.id === taskId && task.projectId === message.projectId)?.title ?? null,
    })),
  }
}

// Same shape as GET /api/projects/:projectId/messages: oldest first, the latest 100,
// or only the messages after `after`.
export function getMessages(projectId, { after } = {}) {
  return respond('getMessages', () => {
    requireMembership(projectId)
    const messages = db.messages.filter((item) => item.projectId === projectId)
    if (after === undefined) return messages.slice(-MESSAGE_LIST_LIMIT).map(serializeMessage)
    const index = messages.findIndex((item) => item.id === after)
    if (index === -1) throw invalid([{ field: 'after', message: 'This message is not in the project chat.' }])
    return messages.slice(index + 1, index + 1 + MESSAGE_LIST_LIMIT).map(serializeMessage)
  })
}

export function sendMessage(projectId, text) {
  return respond('sendMessage', () => {
    const membership = requireMembership(projectId)
    const value = typeof text === 'string' ? text.trim() : ''
    if (!value) throw invalid([{ field: 'text', message: 'Write a message first.' }])
    if (value.length > MAX_MESSAGE_LENGTH) {
      throw invalid([{ field: 'text', message: `Keep the message under ${MAX_MESSAGE_LENGTH} characters.` }])
    }
    const outside = referencedTaskIds(value).filter(
      (taskId) => !db.tasks.some((task) => task.id === taskId && task.projectId === projectId),
    )
    if (outside.length) throw invalid([{ field: 'text', message: 'A mentioned task is not in this project.' }])
    const message = { id: newId('m'), projectId, authorId: membership.userId, text: value, createdAt: now() }
    db.messages.push(message)
    return serializeMessage(message)
  })
}

// Lets tests and reviewers see a teammate's message arrive on the next refresh.
export function addSampleMessage(projectId, authorId, text) {
  db.messages.push({ id: newId('m'), projectId, authorId, text, createdAt: now() })
}

// ---------- AI report (US-31) ----------

// Same rule as the API: one report per project every 10 minutes (429 REPORT_TOO_SOON).
export const REPORT_INTERVAL_MS = 10 * 60 * 1000

function serializeReport(report) {
  return {
    id: report.id,
    projectId: report.projectId,
    content: report.content,
    model: report.model,
    promptVersion: report.promptVersion,
    createdAt: report.createdAt,
    createdBy: { id: report.createdById, username: usernameOf(report.createdById) },
  }
}

function latestReport(projectId) {
  return db.reports
    .filter((item) => item.projectId === projectId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
}

export function getLatestReport(projectId) {
  return respond('getLatestReport', () => {
    requireMembership(projectId)
    const report = latestReport(projectId)
    if (!report) throw new ApiError({ code: 'NO_REPORT', status: 404, message: 'No report has been generated for this project yet.' })
    return serializeReport(report)
  })
}

export const REPORT_HISTORY_LIMIT = 20

// Every report of the project, newest first (up to 20), each with its full text.
export function getReports(projectId) {
  return respond('getReports', () => {
    requireMembership(projectId)
    const reports = db.reports
      .filter((item) => item.projectId === projectId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, REPORT_HISTORY_LIMIT)
    return { reports: reports.map(serializeReport) }
  })
}

// Writes the report from the board's numbers, in the same three sections as the real prompt.
export function generateReport(projectId) {
  return respond('generateReport', () => {
    const membership = requireMembership(projectId)
    if (membership.role !== 'OWNER') throw forbidden('Only the project owner can generate a report.')
    const previous = latestReport(projectId)
    if (previous) {
      const nextAllowedAt = new Date(new Date(previous.createdAt).getTime() + REPORT_INTERVAL_MS)
      if (nextAllowedAt > new Date()) {
        throw new ApiError({
          code: 'REPORT_TOO_SOON',
          status: 429,
          message: 'A report was generated less than 10 minutes ago. Try again later.',
          nextAllowedAt: nextAllowedAt.toISOString(),
        })
      }
    }
    const tasks = projectTasks(projectId)
    const done = tasks.filter((task) => task.status === 'DONE').length
    const today = new Date().toISOString().slice(0, 10)
    const overdue = tasks.filter((task) => task.dueDate && task.dueDate < today && task.status !== 'DONE')
    const blocked = tasks.filter((task) => task.isBlocked)
    const warnings = [
      ...overdue.map((task) => `- **"${task.title}" is overdue**: It was due on ${formatDueDate(task.dueDate, { short: true })}.`),
      ...blocked.map((task) => `- **"${task.title}" is blocked**: ${task.blockedReason || 'no reason given'}.`),
    ]
    const report = {
      id: newId('r'),
      projectId,
      createdById: membership.userId,
      model: 'sample',
      promptVersion: 2,
      createdAt: now(),
      content: [
        '## Progress summary',
        `${done} of ${tasks.length} tasks are done.`,
        '',
        '## Warnings',
        ...(warnings.length ? warnings : ['No warnings.']),
        '',
        '## Suggestions',
        overdue[0]
          ? `- **Agree a new due date for "${overdue[0].title}"**: It is the oldest overdue task.`
          : '- **Keep the board up to date**: Move cards after each meeting.',
      ].join('\n'),
    }
    db.reports.push(report)
    return serializeReport(report)
  })
}

// ---------- Project log ----------

const ACTIVITY_PAGE = 50

// The same kinds as ?kind= on the API (apps/api/src/activity/routes.js).
const ACTIVITY_KINDS = {
  task: (type) => type.startsWith('TASK_'),
  member: (type) => type.startsWith('MEMBER_') || type.startsWith('INVITATION_'),
  project: (type) => type.startsWith('PROJECT_'),
}

export function getActivity(projectId, { actorId, taskId, kind, before, limit = ACTIVITY_PAGE } = {}) {
  return respond('getActivity', () => {
    requireMembership(projectId, { allowArchived: true })
    const all = db.activity
      .filter((event) => event.projectId === projectId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id))
    const matching = all.filter(
      (event) =>
        (!actorId || event.actorId === actorId) &&
        (!taskId || event.taskId === taskId) &&
        (!kind || ACTIVITY_KINDS[kind](event.type)),
    )
    const start = before ? matching.findIndex((event) => event.id === before) + 1 : 0
    const events = matching.slice(start, start + limit)
    const actors = new Map()
    for (const event of all) if (event.actorId && !actors.has(event.actorId)) actors.set(event.actorId, event.actorUsername)
    return {
      events,
      nextCursor: start + limit < matching.length ? events.at(-1).id : null,
      actors: [...actors].map(([id, username]) => ({ id, username })).sort((a, b) => a.username.localeCompare(b.username)),
    }
  })
}
