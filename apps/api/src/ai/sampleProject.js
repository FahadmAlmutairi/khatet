// A made-up project for trying the AI report without a database (TF-14 test call, tests).
// No real people or data.
const user = (id, username) => ({ id, username })
const ali = user('u1', 'ali_dev')
const sara = user('u2', 'sara_ui')
const omar = user('u3', 'omar_qa')

const task = (title, status, assignees, extra = {}) => ({
  title,
  status,
  priority: 'MEDIUM',
  isBlocked: false,
  blockedReason: null,
  dueDate: null,
  updatedAt: new Date('2026-10-28'),
  assignees: assignees.map((u) => ({ user: u })),
  ...extra,
})

export const sampleToday = new Date('2026-11-02T09:00:00Z')

export const sampleProjectData = {
  project: { name: 'Campus Events App' },
  members: [
    { role: 'OWNER', user: ali },
    { role: 'MEMBER', user: sara },
    { role: 'MEMBER', user: omar },
  ],
  tasks: [
    task('Set up database', 'DONE', [ali]),
    task('Sign-in screen', 'DONE', [sara]),
    task('Event list API', 'IN_PROGRESS', [ali], {
      isBlocked: true,
      blockedReason: 'Waiting for the hosting account',
      updatedAt: new Date('2026-10-22'),
      dueDate: new Date('2026-10-30'),
    }),
    task('Event details screen', 'IN_PROGRESS', [ali], { dueDate: new Date('2026-11-04'), priority: 'HIGH' }),
    task('Search events', 'TODO', [ali], { dueDate: new Date('2026-11-05') }),
    task('Notifications', 'TODO', [ali]),
    task('Write test plan', 'READY_FOR_REVIEW', [omar]),
    task('Profile screen', 'BACKLOG', [sara]),
  ],
}
