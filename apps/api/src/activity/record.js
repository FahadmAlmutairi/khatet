// Writes one row to the project log (activity_events). Call it inside the same transaction
// as the change, so the log never shows a change that was rolled back.
export function recordActivity(tx, { projectId, actor, type, task = null, details = {} }) {
  return tx.activityEvent.create({
    data: {
      projectId,
      actorId: actor.id,
      actorUsername: actor.username,
      type,
      taskId: task?.id ?? null,
      taskTitle: task?.title ?? null,
      details,
    },
  })
}

// Usernames for a list of user IDs, in the same order, for the log's details.
export async function usernamesFor(tx, userIds) {
  if (!userIds.length) return []
  const users = await tx.user.findMany({ where: { id: { in: userIds } }, select: { id: true, username: true } })
  const byId = new Map(users.map((user) => [user.id, user.username]))
  return userIds.map((id) => byId.get(id) ?? 'unknown')
}
