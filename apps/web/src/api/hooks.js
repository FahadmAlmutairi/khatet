// TanStack Query hooks with the query keys from docs/api-contract.md.
// The screens only use these hooks, so swapping the sample API for the real
// Express client later changes this file and ./client.js, not the screens.
import { useEffect, useRef, useState } from 'react'
import { keepPreviousData, useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { chatSocketEnabled, getChatSocket, joinProjectRoom } from './chatSocket.js'
import { api } from './client.js'

export const keys = {
  me: ['me'],
  projects: ['projects'],
  project: (projectId) => ['project', projectId],
  members: (projectId) => ['members', projectId],
  tasks: (projectId) => ['tasks', { projectId }],
  task: (taskId) => ['task', taskId],
  notifications: ['notifications'],
  messages: (projectId) => ['messages', projectId],
  report: (projectId) => ['report', projectId],
  reports: (projectId) => ['reports', projectId],
  activity: (projectId, filter = {}) => ['activity', projectId, filter],
  archivedProjects: ['archivedProjects'],
  archivedProject: (projectId) => ['archivedProject', projectId],
}

// ---------- Session ----------

export function useMe() {
  return useQuery({ queryKey: keys.me, queryFn: api.getMe, staleTime: Infinity })
}

export function useRequestCode() {
  return useMutation({ mutationFn: api.requestCode })
}

export function useVerifyCode() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.verifyCode,
    onSuccess: (user) => queryClient.setQueryData(keys.me, user),
  })
}

export function useSetUsername() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.setUsername,
    onSuccess: (user) => queryClient.setQueryData(keys.me, user),
  })
}

export function useSignOut() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.signOut,
    onSuccess: () => {
      queryClient.clear()
      queryClient.setQueryData(keys.me, null)
    },
  })
}

// ---------- Projects ----------

export function useProjects() {
  return useQuery({ queryKey: keys.projects, queryFn: api.getProjects })
}

export function useProject(projectId) {
  return useQuery({ queryKey: keys.project(projectId), queryFn: () => api.getProject(projectId) })
}

export function useCreateProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.createProject,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.projects }),
  })
}

export function useUpdateProject(projectId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (patch) => api.updateProject(projectId, patch),
    onSuccess: (project) => {
      queryClient.setQueryData(keys.project(projectId), project)
      queryClient.setQueryData(keys.projects, (projects) =>
        projects?.map((item) => (item.id === project.id ? { ...item, ...project } : item)),
      )
    },
  })
}

// ---------- Archived projects ----------

// Owner only. The project leaves everyone's sidebar; its log moves to Settings > Archived projects.
export function useArchiveProject(projectId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api.archiveProject(projectId),
    onSuccess: (archived) => {
      queryClient.setQueryData(keys.projects, (projects) => projects?.filter((project) => project.id !== projectId))
      queryClient.setQueryData(keys.archivedProject(projectId), archived)
      queryClient.invalidateQueries({ queryKey: keys.archivedProjects })
      queryClient.invalidateQueries({ queryKey: keys.notifications })
      for (const key of [keys.project(projectId), keys.tasks(projectId), keys.members(projectId), keys.messages(projectId)]) {
        queryClient.removeQueries({ queryKey: key, exact: true })
      }
    },
  })
}

export function useArchivedProjects() {
  return useQuery({ queryKey: keys.archivedProjects, queryFn: api.getArchivedProjects })
}

export function useArchivedProject(projectId) {
  return useQuery({ queryKey: keys.archivedProject(projectId), queryFn: () => api.getArchivedProject(projectId) })
}

// Deletes the archived log for the signed-in user only; the others keep theirs.
export function useDeleteArchivedProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (projectId) => api.deleteArchivedProject(projectId),
    onSuccess: (_, projectId) => {
      queryClient.setQueryData(keys.archivedProjects, (items) => items?.filter((item) => item.id !== projectId))
    },
  })
}

// Owner only: the project opens again for every member.
export function useRestoreProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (projectId) => api.restoreProject(projectId),
    onSuccess: (_, projectId) => {
      queryClient.setQueryData(keys.archivedProjects, (items) => items?.filter((item) => item.id !== projectId))
      queryClient.removeQueries({ queryKey: keys.project(projectId), exact: true })
      queryClient.removeQueries({ queryKey: ['activity', projectId] })
      queryClient.invalidateQueries({ queryKey: keys.projects })
    },
  })
}

// ---------- Members ----------

export function useMembers(projectId) {
  return useQuery({ queryKey: keys.members(projectId), queryFn: () => api.getMembers(projectId) })
}

export function useUpdateMemberAccess(projectId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, taskAccess }) => api.updateMemberAccess(projectId, userId, taskAccess),
    onSuccess: (member) => {
      queryClient.setQueryData(keys.members(projectId), (data) =>
        data && {
          ...data,
          members: data.members.map((item) => (item.userId === member.userId ? { ...item, ...member } : item)),
        },
      )
      // Task permissions depend on access levels.
      queryClient.invalidateQueries({ queryKey: keys.tasks(projectId) })
    },
  })
}

export function useRemoveMember(projectId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (userId) => api.removeMember(projectId, userId),
    onSuccess: ({ userId }) => {
      queryClient.setQueryData(keys.members(projectId), (data) =>
        data && { ...data, members: data.members.filter((member) => member.userId !== userId) },
      )
      queryClient.invalidateQueries({ queryKey: keys.tasks(projectId) })
    },
  })
}

export function useLeaveProject(projectId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api.leaveProject(projectId),
    onSuccess: ({ userId }) => {
      queryClient.setQueryData(keys.projects, (projects) => projects?.filter((project) => project.id !== projectId))
      queryClient.setQueryData(keys.members(projectId), (data) =>
        data && { ...data, members: data.members.filter((member) => member.userId !== userId) },
      )
      queryClient.removeQueries({ queryKey: keys.project(projectId), exact: true })
      queryClient.removeQueries({ queryKey: keys.tasks(projectId), exact: true })
    },
  })
}

export function useInviteMember(projectId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (username) => api.inviteMember(projectId, username),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.members(projectId) }),
  })
}

export function useCancelInvitation(projectId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (invitationId) => api.cancelInvitation(projectId, invitationId),
    onSettled: () => queryClient.invalidateQueries({ queryKey: keys.members(projectId) }),
  })
}

// ---------- Tasks ----------

// Teammates' changes show up within 20 seconds while the board is open (review M9), until the
// Socket.IO updates planned for Sprint 3 replace this.
const TASKS_REFRESH_MS = 20_000

export function useTasks(projectId) {
  return useQuery({
    queryKey: keys.tasks(projectId),
    queryFn: () => api.getTasks(projectId),
    select: withoutPending,
    refetchInterval: TASKS_REFRESH_MS,
  })
}

export function useTask(taskId) {
  return useQuery({ queryKey: keys.task(taskId), queryFn: () => api.getTask(taskId), enabled: Boolean(taskId) })
}

// A change to a task adds to the project log, so the log and task activity load again.
function refreshActivity(queryClient, projectId) {
  queryClient.invalidateQueries({ queryKey: ['activity', projectId] })
}

function replaceTask(queryClient, task) {
  queryClient.setQueryData(keys.task(task.id), task)
  queryClient.setQueryData(keys.tasks(task.projectId), (tasks) =>
    tasks?.map((item) => (item.id === task.id ? task : item)),
  )
}

export function useCreateTask(projectId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input) => api.createTask(projectId, input),
    onSuccess: (task) => {
      queryClient.setQueryData(keys.tasks(projectId), (tasks) => (tasks ? [...tasks, task] : tasks))
      refreshActivity(queryClient, projectId)
    },
  })
}

export function useUpdateTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, patch }) => api.updateTask(taskId, patch),
    onSuccess: (task) => {
      replaceTask(queryClient, task)
      refreshActivity(queryClient, task.projectId)
    },
  })
}

// Moves the card at once, then keeps the server's order; on failure the board goes
// back to where it was (docs/api-contract.md, Board movement contract).
// When moves overlap, an earlier answer would undo the later card on screen, so only the
// last move to finish writes the server's order; the board then refetches once.
export function useMoveTask(projectId) {
  const queryClient = useQueryClient()
  const tasksKey = keys.tasks(projectId)
  const mutationKey = ['moveTask', projectId]
  const othersMoving = () => queryClient.isMutating({ mutationKey }) > 1
  const overlapped = useRef(false)
  return useMutation({
    mutationKey,
    mutationFn: ({ taskId, status, position }) => api.moveTask(taskId, { status, position }),
    onMutate: async ({ taskId, status, position }) => {
      // Set the new order before awaiting, so a dropped card never flashes back to its old place.
      const previous = queryClient.getQueryData(tasksKey)
      const next = previous && applyMove(previous, taskId, status, position)
      if (next) queryClient.setQueryData(tasksKey, next)
      await queryClient.cancelQueries({ queryKey: tasksKey })
      if (next) queryClient.setQueryData(tasksKey, next)
      return { previous }
    },
    onError: (_error, _variables, context) => {
      if (othersMoving()) {
        overlapped.current = true
        return
      }
      if (context?.previous) queryClient.setQueryData(tasksKey, context.previous)
    },
    onSuccess: (tasks, { taskId }) => {
      const moved = tasks.find((task) => task.id === taskId)
      if (moved) queryClient.setQueryData(keys.task(taskId), moved)
      if (othersMoving()) {
        overlapped.current = true
        return
      }
      queryClient.setQueryData(tasksKey, tasks)
    },
    onSettled: () => {
      refreshActivity(queryClient, projectId)
      if (othersMoving() || !overlapped.current) return
      // Answers skipped above (a failed one too) are settled by one fresh copy from the server.
      overlapped.current = false
      queryClient.invalidateQueries({ queryKey: tasksKey })
    },
  })
}

// Same rule as the server: whole-number positions, other cards shift.
export function applyMove(tasks, taskId, status, position) {
  const moving = tasks.find((task) => task.id === taskId)
  if (!moving) return tasks
  const updated = {
    ...moving,
    status,
    ...(status === 'IN_PROGRESS' ? {} : { isBlocked: false, blockedReason: null }),
  }
  const byPosition = (a, b) => a.position - b.position
  const rest = tasks.filter((task) => task.id !== taskId)
  const target = rest.filter((task) => task.status === status).sort(byPosition)
  target.splice(Math.min(Math.max(position - 1, 0), target.length), 0, updated)
  const source = status === moving.status ? [] : rest.filter((task) => task.status === moving.status).sort(byPosition)

  const renumbered = new Map()
  for (const column of [source, target]) {
    column.forEach((task, index) => renumbered.set(task.id, { ...task, position: index + 1 }))
  }
  return [...rest.filter((task) => !renumbered.has(task.id)), ...renumbered.values()]
}

// Tasks deleted in the last few seconds are hidden at once but only removed on the server when
// their Undo time ends, so Undo can bring them back as they were. A refetch meanwhile stays hidden.
const pendingDeletes = new Set()
const withoutPending = (tasks) => (pendingDeletes.size ? tasks.filter((task) => !pendingDeletes.has(task.id)) : tasks)

export function useDeleteTaskWithUndo(projectId) {
  const queryClient = useQueryClient()
  const tasksKey = keys.tasks(projectId)
  const drop = (id) => queryClient.setQueryData(tasksKey, (tasks) => tasks?.filter((task) => task.id !== id))
  return (task) => {
    pendingDeletes.add(task.id)
    drop(task.id)
    let settled = false
    return {
      restore() {
        if (settled) return
        settled = true
        pendingDeletes.delete(task.id)
        queryClient.setQueryData(tasksKey, (tasks) => (!tasks || tasks.some((item) => item.id === task.id) ? tasks : [...tasks, task]))
        queryClient.invalidateQueries({ queryKey: tasksKey })
      },
      // Resolves once the server removed it; on failure the task comes back and the error is passed on.
      async commit() {
        if (settled) return
        settled = true
        try {
          await api.deleteTask(task.id)
          drop(task.id)
          queryClient.removeQueries({ queryKey: keys.task(task.id), exact: true })
        } finally {
          pendingDeletes.delete(task.id)
          queryClient.invalidateQueries({ queryKey: tasksKey })
        }
      },
    }
  }
}

// ---------- Notifications ----------

export function useNotifications() {
  return useQuery({ queryKey: keys.notifications, queryFn: api.getNotifications, refetchInterval: 30_000 })
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.markNotificationRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.notifications }),
  })
}

// The API marks one notification at a time, so "Mark all as read" sends one request per unread item.
export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (ids) => Promise.all(ids.map((id) => api.markNotificationRead(id))),
    onSettled: () => queryClient.invalidateQueries({ queryKey: keys.notifications }),
  })
}

export function useRespondToInvitation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ invitationId, accept }) =>
      accept ? api.acceptInvitation(invitationId) : api.declineInvitation(invitationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.notifications })
      queryClient.invalidateQueries({ queryKey: keys.projects })
    },
  })
}

// ---------- Project chat (US-24) ----------

// NFR-09: a message reaches the team within 5 seconds, so the open chat asks for new
// messages every 3 seconds whenever Socket.IO is not connected (TR-05).
export const CHAT_REFRESH_MS = 3000

// Adds messages to the end of the chat, skipping any already shown.
// Before the first load there is nothing to add to: the load brings the latest messages.
function appendMessages(shown, newer) {
  if (!shown) return shown
  const known = new Set(shown.map((message) => message.id))
  const fresh = newer.filter((message) => !known.has(message.id))
  return fresh.length ? [...shown, ...fresh] : shown
}

// TR-05: while the chat is open, joins the project's Socket.IO room and adds each `message:new`
// to the chat. Returns true while the room is joined; the chat refreshes every 3 seconds otherwise.
// After a reconnect it loads anything sent while it was away through REST.
export function useChatSocket(projectId, { enabled = true } = {}) {
  const queryClient = useQueryClient()
  const [live, setLive] = useState(false)

  useEffect(() => {
    if (!enabled || !chatSocketEnabled) return undefined
    let active = true
    let socket = null

    async function join() {
      const joined = await joinProjectRoom(socket, projectId)
      if (!active) return
      setLive(joined)
      if (joined) queryClient.invalidateQueries({ queryKey: keys.messages(projectId) })
    }
    function onMessage(message) {
      if (message?.projectId !== projectId) return
      queryClient.setQueryData(keys.messages(projectId), (shown) => appendMessages(shown, [message]))
    }
    function onDisconnect() {
      setLive(false)
    }

    getChatSocket()
      .then((loaded) => {
        if (!active) return
        socket = loaded
        socket.on('connect', join)
        socket.on('disconnect', onDisconnect)
        socket.on('message:new', onMessage)
        if (socket.connected) join()
        else socket.connect()
      })
      // If the client cannot load, the chat simply keeps refreshing every 3 seconds.
      .catch(() => {})

    return () => {
      active = false
      setLive(false)
      if (!socket) return
      socket.off('connect', join)
      socket.off('disconnect', onDisconnect)
      socket.off('message:new', onMessage)
      socket.emit('chat:leave', { projectId })
      // The socket is only needed while a chat is open; this frees the free Render server.
      socket.disconnect()
    }
  }, [enabled, projectId, queryClient])

  return enabled && chatSocketEnabled && live
}

// The first request loads the latest messages; each refresh asks only for the ones after
// the newest message already shown and adds them to the end.
export function useMessages(projectId, { enabled = true } = {}) {
  const queryClient = useQueryClient()
  const live = useChatSocket(projectId, { enabled })
  return useQuery({
    queryKey: keys.messages(projectId),
    enabled,
    refetchInterval: enabled && !live ? CHAT_REFRESH_MS : false,
    queryFn: async () => {
      const shown = queryClient.getQueryData(keys.messages(projectId))
      const last = shown?.at(-1)
      if (!last) return api.getMessages(projectId)
      try {
        const newer = await api.getMessages(projectId, { after: last.id })
        // A message:new may have arrived during the request, so add to what is shown now.
        return appendMessages(queryClient.getQueryData(keys.messages(projectId)) ?? shown, newer)
      } catch (error) {
        // The cursor is no longer accepted (for example after a data reset): load the latest again.
        if (error.code === 'VALIDATION_FAILED') return api.getMessages(projectId)
        throw error
      }
    },
  })
}

// After sending, the chat refreshes from the newest message it had, so a teammate's message
// sent a moment earlier shows up before ours, in the server's order.
export function useSendMessage(projectId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (text) => api.sendMessage(projectId, text),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.messages(projectId) }),
  })
}

// ---------- AI report (US-31) ----------

// The latest report, or null when none has been generated yet (404 NO_REPORT).
export function useLatestReport(projectId, { enabled = true } = {}) {
  return useQuery({
    queryKey: keys.report(projectId),
    enabled,
    queryFn: async () => {
      try {
        return await api.getLatestReport(projectId)
      } catch (error) {
        if (error.code === 'NO_REPORT') return null
        throw error
      }
    },
  })
}

// Every report of the project, newest first (up to 20), for the Reports page and its history.
export function useReports(projectId, { enabled = true } = {}) {
  return useQuery({
    queryKey: keys.reports(projectId),
    enabled,
    queryFn: async () => (await api.getReports(projectId)).reports,
  })
}

// Owner only. The new report goes to the top of the list; the API refuses a second run within 10 minutes.
export function useGenerateReport(projectId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api.generateReport(projectId),
    onSuccess: (report) => {
      queryClient.setQueryData(keys.report(projectId), report)
      queryClient.setQueryData(keys.reports(projectId), (old) => [report, ...(old ?? []).filter((item) => item.id !== report.id)])
    },
  })
}

// ---------- Project log ----------

// Newest first, 50 at a time; fetchNextPage loads older entries. Refetched each time the page opens.
// filter: { actorId } for one person, { taskId } for one task (task details), { kind } for one
// kind of change (task, member or project).
// keepPrevious keeps the last list on screen while a new filter loads, so the page can fade
// between lists instead of flashing a loading message.
export function useActivity(projectId, { actorId, taskId, kind, enabled = true, keepPrevious = false } = {}) {
  const filter = { ...(actorId ? { actorId } : {}), ...(taskId ? { taskId } : {}), ...(kind ? { kind } : {}) }
  return useInfiniteQuery({
    queryKey: keys.activity(projectId, filter),
    queryFn: ({ pageParam }) => api.getActivity(projectId, { ...filter, before: pageParam }),
    enabled,
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: 0,
    placeholderData: keepPrevious ? keepPreviousData : undefined,
  })
}
