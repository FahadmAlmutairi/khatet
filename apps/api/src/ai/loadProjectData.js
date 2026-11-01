// Reads one project's members and tasks for the AI report (TF-14).
import { prisma } from '../db.js'

export async function loadProjectData(projectId) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      members: { include: { user: { select: { id: true, username: true } } } },
      tasks: { include: { assignees: { include: { user: { select: { id: true, username: true } } } } } },
    },
  })
  if (!project) return null
  const { members, tasks, ...rest } = project
  return { project: rest, members, tasks }
}
