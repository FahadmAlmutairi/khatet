// In-memory stand-in for the Express API so the Sprint 1 screens can be built and
// reviewed before the backend routes exist. It applies the same permission rules as
// docs/api-contract.md so the screens show the right states, but the real checks
// belong to the backend. Data resets when the page reloads.
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
function requireMembership(projectId) {
  const user = requireUser()
  const membership = db.members.find((item) => item.projectId === projectId && item.userId === user.id)
  if (!membership) throw notFound('This project does not exist or you are not a member of it.')
  return membership
}

function usernameOf(userId) {
  return db.users.find((user) => user.id === userId)?.username ?? 'unknown'
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

// The username rule is not in the documents yet; agree it with the US-01 owner.
export function setUsername(username) {
  return respond('setUsername', () => {
    const user = requireUser()
    const value = (username ?? '').trim().replace(/^@/, '').toLowerCase()
    if (!/^[a-z0-9_]{3,20}$/.test(value)) {
      throw invalid([{ field: 'username', message: 'Use 3 to 20 letters, numbers or underscores.' }])
    }
    if (db.users.some((item) => item.username === value && item.id !== user.id)) {
      throw invalid([{ field: 'username', message: `${value} is taken. Try another username.` }])
    }
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
      .filter((item) => item.userId === user.id)
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
    target.taskAccess = taskAccess
    return { ...target, username: usernameOf(userId) }
  })
}

export function inviteMember(projectId, username) {
  return respond('inviteMember', () => {
    const membership = requireMembership(projectId)
    if (membership.role !== 'OWNER') throw forbidden('Only the project owner can invite members.')
    const value = (username ?? '').trim().replace(/^@/, '').toLowerCase()
    if (!value) throw invalid([{ field: 'username', message: 'Enter a username.' }])
    const user = db.users.find((item) => item.username === value)
    if (!user) throw invalid([{ field: 'username', message: `No user has the username ${value}.` }])
    if (db.members.some((item) => item.projectId === projectId && item.userId === user.id)) {
      throw invalid([{ field: 'username', message: `${value} is already a member of this project.` }])
    }
    if (db.invitations.some((item) => item.projectId === projectId && item.invitedUserId === user.id && item.status === 'PENDING')) {
      throw invalid([{ field: 'username', message: `${value} already has a pending invitation.` }])
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
    Object.assign(task, fields, { updatedAt: now() })
    notifyAssignees(task, added)
    return withPermissions(task, membership)
  })
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
