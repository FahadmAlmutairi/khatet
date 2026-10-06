// TanStack Query hooks with the query keys from docs/api-contract.md.
// The screens only use these hooks, so swapping the sample API for the real
// Express client later changes this file and ./client.js, not the screens.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client.js'

export const keys = {
  me: ['me'],
  projects: ['projects'],
  project: (projectId) => ['project', projectId],
  members: (projectId) => ['members', projectId],
  tasks: (projectId) => ['tasks', { projectId }],
  task: (taskId) => ['task', taskId],
  notifications: ['notifications'],
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

export function useInviteMember(projectId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (username) => api.inviteMember(projectId, username),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.members(projectId) }),
  })
}

// ---------- Tasks ----------

export function useTasks(projectId) {
  return useQuery({ queryKey: keys.tasks(projectId), queryFn: () => api.getTasks(projectId) })
}

export function useTask(taskId) {
  return useQuery({ queryKey: keys.task(taskId), queryFn: () => api.getTask(taskId), enabled: Boolean(taskId) })
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
    },
  })
}

export function useUpdateTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, patch }) => api.updateTask(taskId, patch),
    onSuccess: (task) => replaceTask(queryClient, task),
  })
}

// Moves the card at once, then keeps the server's order; on failure the board goes
// back to where it was (docs/api-contract.md, Board movement contract).
export function useMoveTask(projectId) {
  const queryClient = useQueryClient()
  const tasksKey = keys.tasks(projectId)
  return useMutation({
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
      if (context?.previous) queryClient.setQueryData(tasksKey, context.previous)
    },
    onSuccess: (tasks, { taskId }) => {
      queryClient.setQueryData(tasksKey, tasks)
      const moved = tasks.find((task) => task.id === taskId)
      if (moved) queryClient.setQueryData(keys.task(taskId), moved)
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

export function useDeleteTask(projectId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (taskId) => api.deleteTask(taskId),
    onSuccess: ({ id }) => {
      queryClient.setQueryData(keys.tasks(projectId), (tasks) => tasks?.filter((task) => task.id !== id))
      queryClient.invalidateQueries({ queryKey: keys.tasks(projectId) })
    },
  })
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
