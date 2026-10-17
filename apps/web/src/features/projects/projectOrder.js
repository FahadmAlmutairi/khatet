import { useMemo, useSyncExternalStore } from 'react'
import { arrayMove } from '@dnd-kit/sortable'

// The order a person drags their projects into in the sidebar. It is a display preference, so it is kept
// in this browser per user (like the collapsed sidebar), and the sidebar, rail and home page share it.
// Projects missing from the saved order (new ones, or ones joined since) keep the server's order at the end.
const keyFor = (userId) => `khatet.projectOrder.${userId}`
const listeners = new Set()
// Used only when the browser blocks storage, so a new order still lasts until the page reloads.
const memory = new Map()

function read(userId) {
  try {
    return localStorage.getItem(keyFor(userId)) ?? '[]'
  } catch {
    return '[]'
  }
}

function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function save(userId, ids) {
  try {
    localStorage.setItem(keyFor(userId), JSON.stringify(ids))
  } catch {
    memory.set(userId, JSON.stringify(ids))
  }
  listeners.forEach((listener) => listener())
}

function parse(raw) {
  try {
    const ids = JSON.parse(raw)
    return Array.isArray(ids) ? ids : []
  } catch {
    return []
  }
}

export function sortProjects(projects, savedIds) {
  const rank = new Map(savedIds.map((id, index) => [id, index]))
  return projects
    .map((project, index) => ({ project, index }))
    .sort((a, b) => (rank.get(a.project.id) ?? savedIds.length + a.index) - (rank.get(b.project.id) ?? savedIds.length + b.index))
    .map(({ project }) => project)
}

// Returns the projects in the person's order and a function that moves one project to another's place.
export function useProjectOrder(projects, userId) {
  const raw = useSyncExternalStore(subscribe, () => (userId ? (memory.get(userId) ?? read(userId)) : '[]'))
  const ordered = useMemo(() => (projects ? sortProjects(projects, parse(raw)) : projects), [projects, raw])

  function move(activeId, overId) {
    if (!userId || !ordered || activeId === overId) return
    const ids = ordered.map((project) => project.id)
    const from = ids.indexOf(activeId)
    const to = ids.indexOf(overId)
    if (from < 0 || to < 0) return
    save(userId, arrayMove(ids, from, to))
  }

  return { projects: ordered, move }
}
