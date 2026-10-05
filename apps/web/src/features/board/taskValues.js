export function emptyTaskValues() {
  return { title: '', assigneeIds: [], priority: '', dueDate: '', description: '' }
}

export function taskValues(task) {
  return {
    title: task.title,
    assigneeIds: task.assigneeIds,
    priority: task.priority ?? '',
    dueDate: task.dueDate ?? '',
    description: task.description ?? '',
  }
}
