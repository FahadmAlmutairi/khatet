// Sample data for the Sprint 1 screens. Field names follow docs/data-model.md and the
// illustrative shapes in docs/api-contract.md. Replace with the real API once the
// OpenAPI file for each route is agreed.

export const SAMPLE_EMAIL = 'fahad@example.com'

export function createSampleData() {
  return {
    users: [
      { id: 'u-fahad', email: SAMPLE_EMAIL, username: 'fahad' },
      { id: 'u-sara', email: 'sara@example.com', username: 'sara' },
      { id: 'u-omar', email: 'omar@example.com', username: 'omar' },
      { id: 'u-lina', email: 'lina@example.com', username: 'lina' },
      { id: 'u-nora', email: 'nora@example.com', username: 'nora' },
      { id: 'u-khalid', email: 'khalid@example.com', username: 'khalid' },
    ],
    projects: [
      {
        id: 'p-khatet',
        name: 'Khatet',
        description: 'Project management for student teams',
        createdAt: '2026-09-01T09:00:00Z',
      },
      {
        id: 'p-study',
        name: 'Study Planner',
        description: 'Weekly plan for the data structures course',
        createdAt: '2026-09-05T09:00:00Z',
      },
      {
        id: 'p-capstone',
        name: 'Capstone Research',
        description: 'Literature review and survey analysis',
        createdAt: '2026-09-10T09:00:00Z',
      },
      {
        id: 'p-mobile',
        name: 'Mobile App Study',
        description: 'Usability study of three campus apps',
        createdAt: '2026-09-20T09:00:00Z',
      },
    ],
    members: [
      { projectId: 'p-khatet', userId: 'u-fahad', role: 'OWNER', taskAccess: 'EDIT_ALL' },
      { projectId: 'p-khatet', userId: 'u-sara', role: 'MEMBER', taskAccess: 'EDIT_ALL' },
      { projectId: 'p-khatet', userId: 'u-omar', role: 'MEMBER', taskAccess: 'EDIT_ASSIGNED' },
      { projectId: 'p-khatet', userId: 'u-lina', role: 'MEMBER', taskAccess: 'VIEW_ONLY' },
      { projectId: 'p-study', userId: 'u-sara', role: 'OWNER', taskAccess: 'EDIT_ALL' },
      { projectId: 'p-study', userId: 'u-fahad', role: 'MEMBER', taskAccess: 'EDIT_ASSIGNED' },
      { projectId: 'p-study', userId: 'u-omar', role: 'MEMBER', taskAccess: 'EDIT_ASSIGNED' },
      { projectId: 'p-capstone', userId: 'u-omar', role: 'OWNER', taskAccess: 'EDIT_ALL' },
      { projectId: 'p-capstone', userId: 'u-fahad', role: 'MEMBER', taskAccess: 'VIEW_ONLY' },
      { projectId: 'p-mobile', userId: 'u-lina', role: 'OWNER', taskAccess: 'EDIT_ALL' },
    ],
    invitations: [
      {
        id: 'inv-mobile-fahad',
        projectId: 'p-mobile',
        invitedUserId: 'u-fahad',
        invitedById: 'u-lina',
        status: 'PENDING',
        createdAt: '2026-10-05T08:15:00Z',
      },
      {
        id: 'inv-khatet-nora',
        projectId: 'p-khatet',
        invitedUserId: 'u-nora',
        invitedById: 'u-fahad',
        status: 'PENDING',
        createdAt: '2026-09-19T10:00:00Z',
      },
    ],
    tasks: [
      task('t-1', 'p-khatet', 'Collect interview notes', 'BACKLOG', 1, ['u-lina'], { priority: 'LOW' }),
      task('t-2', 'p-khatet', 'Draft onboarding checklist copy', 'BACKLOG', 2, ['u-sara'], {}),
      task('t-3', 'p-khatet', 'Prepare usability test script', 'TODO', 1, ['u-sara'], {
        priority: 'HIGH',
        dueDate: '2026-10-09',
      }),
      task('t-4', 'p-khatet', 'Write sign-in error messages', 'TODO', 2, ['u-omar'], { priority: 'MEDIUM' }),
      task('t-5', 'p-khatet', 'Set up the tasks table migration', 'TODO', 3, ['u-fahad', 'u-sara', 'u-omar', 'u-lina'], {
        priority: 'HIGH',
        dueDate: '2026-10-10',
        description:
          'Create the Task and TaskAssignee tables with the fields from docs/data-model.md. Every task keeps at least one assignee.',
      }),
      task('t-6', 'p-khatet', 'Fix CSV validation errors', 'IN_PROGRESS', 1, ['u-fahad'], {
        priority: 'HIGH',
        dueDate: '2026-10-08',
        isBlocked: true,
        blockedReason: 'Waiting for sample file',
      }),
      task('t-7', 'p-khatet', 'Build the board columns', 'IN_PROGRESS', 2, ['u-fahad', 'u-omar'], {
        priority: 'MEDIUM',
        dueDate: '2026-10-11',
      }),
      task('t-8', 'p-khatet', 'Define board hierarchy', 'READY_FOR_REVIEW', 1, ['u-fahad', 'u-sara'], {
        priority: 'MEDIUM',
        dueDate: '2026-09-20',
        description: 'Clarify the board columns, movement rules, and work-in-progress limits before the next review.',
      }),
      task('t-9', 'p-khatet', 'Agree the colour tokens', 'DONE', 1, ['u-sara'], { priority: 'LOW' }),
      task('t-10', 'p-khatet', 'Set up the React project', 'DONE', 2, ['u-fahad'], {}),
      task('t-11', 'p-study', 'Summarise chapter 4 (trees)', 'TODO', 1, ['u-fahad'], {
        priority: 'MEDIUM',
        dueDate: '2026-10-12',
      }),
      task('t-12', 'p-study', 'Solve past exam questions', 'IN_PROGRESS', 1, ['u-sara', 'u-omar'], { priority: 'HIGH' }),
      task('t-13', 'p-study', 'Book a study room', 'DONE', 1, ['u-omar'], {}),
      task('t-14', 'p-capstone', 'Collect survey responses', 'IN_PROGRESS', 1, ['u-omar', 'u-fahad'], {
        priority: 'HIGH',
        dueDate: '2026-10-15',
      }),
      task('t-15', 'p-capstone', 'List related papers', 'TODO', 1, ['u-omar'], { priority: 'LOW' }),
    ],
    notifications: [
      {
        id: 'n-1',
        userId: 'u-fahad',
        type: 'INVITATION',
        invitationId: 'inv-mobile-fahad',
        projectId: 'p-mobile',
        actorId: 'u-lina',
        read: false,
        createdAt: '2026-10-05T08:15:00Z',
      },
      {
        id: 'n-2',
        userId: 'u-fahad',
        type: 'TASK_ASSIGNED',
        taskId: 't-11',
        projectId: 'p-study',
        actorId: 'u-sara',
        read: false,
        createdAt: '2026-10-04T16:30:00Z',
      },
      {
        id: 'n-3',
        userId: 'u-fahad',
        type: 'TASK_ASSIGNED',
        taskId: 't-14',
        projectId: 'p-capstone',
        actorId: 'u-omar',
        read: true,
        createdAt: '2026-10-02T11:00:00Z',
      },
    ],
  }
}

function task(id, projectId, title, status, position, assigneeIds, extra) {
  return {
    id,
    projectId,
    title,
    description: '',
    status,
    position,
    isBlocked: false,
    blockedReason: null,
    priority: null,
    dueDate: null,
    assigneeIds,
    createdById: 'u-fahad',
    createdAt: '2026-09-14T09:00:00Z',
    updatedAt: '2026-09-14T09:00:00Z',
    ...extra,
  }
}
