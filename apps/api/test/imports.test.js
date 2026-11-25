import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import request from 'supertest'
import app from '../src/app.js'
import { prisma } from '../src/db.js'
import { authHeader, createProject, createUser, hasTestDatabase, resetDatabase } from './helpers.js'

describe.skipIf(!hasTestDatabase)('US-33: import tasks from a CSV file', () => {
  let owner, sara, omar, project

  beforeEach(async () => {
    await resetDatabase()
    owner = await createUser('owner_user')
    sara = await createUser('sara')
    omar = await createUser('omar')
    project = await createProject(owner, [{ user: sara }])
  })
  afterAll(() => prisma.$disconnect())

  const preview = (as, body, projectId = project.id) =>
    request(app).post(`/api/projects/${projectId}/imports/preview`).set(authHeader(as)).send(body)
  const confirm = (as, body, projectId = project.id) =>
    request(app).post(`/api/projects/${projectId}/imports/confirm`).set(authHeader(as)).send(body)

  const csv = [
    'Task,Details,Stage,Priority,Due,Assigned to',
    'Write the report,First draft,In progress,High,2026-12-01,sara',
    'Book the room,,,,,',
    ',Missing title,,,,',
    'Plan the demo,,Later,,,ghost',
    'Fix the footer,,Done,Low,2026/12/03,@Sara; owner_user',
  ].join('\n')
  const mapping = ['title', 'description', 'status', 'priority', 'dueDate', 'assignees']

  describe('preview', () => {
    it('answers the columns, a suggested match and sample rows, and saves nothing', async () => {
      const res = await preview(owner, { csv })
      expect(res.status).toBe(200)
      expect(res.body).toEqual({
        columns: ['Task', 'Details', 'Stage', 'Priority', 'Due', 'Assigned to'],
        suggestedMapping: mapping,
        rowCount: 5,
        sample: [
          ['Write the report', 'First draft', 'In progress', 'High', '2026-12-01', 'sara'],
          ['Book the room', '', '', '', '', ''],
          ['', 'Missing title', '', '', '', ''],
        ],
      })
      expect(await prisma.task.count()).toBe(0)
    })

    it('with a mapping, answers every row with its values and problems', async () => {
      const res = await preview(owner, { csv, mapping })
      expect(res.status).toBe(200)
      expect(res.body).toMatchObject({ mapping, validCount: 3, skippedCount: 2 })
      expect(res.body.rows).toHaveLength(5)
      expect(res.body.rows[0]).toEqual({
        line: 2,
        values: {
          title: 'Write the report',
          description: 'First draft',
          status: 'IN_PROGRESS',
          priority: 'HIGH',
          dueDate: '2026-12-01',
          assignees: ['sara'],
        },
        errors: [],
      })
      expect(res.body.rows[1].values.assignees).toEqual(['owner_user'])
      expect(res.body.rows[2].errors).toEqual([{ field: 'title', message: 'The title is empty.' }])
      expect(res.body.rows[3].errors.map((error) => error.field)).toEqual(['status', 'assignees'])
      expect(res.body.rows[3].errors[1].message).toBe('ghost is not a member of this project.')
      expect(await prisma.task.count()).toBe(0)
    })

    it('rejects a mapping without a title or with a field twice', async () => {
      const noTitle = await preview(owner, { csv, mapping: [null, 'description', null, null, null, null] })
      expect(noTitle.status).toBe(422)
      expect(noTitle.body.error.fieldErrors).toEqual([{ field: 'mapping', message: 'Choose the column that holds the task title.' }])

      const twice = await preview(owner, { csv, mapping: ['title', 'title', null, null, null, null] })
      expect(twice.status).toBe(422)
      expect(twice.body.error.fieldErrors[0].message).toBe('Only one column can fill Title.')
    })

    it('explains a file it cannot read', async () => {
      const empty = await preview(owner, { csv: '' })
      expect(empty.status).toBe(422)
      expect(empty.body.error.code).toBe('VALIDATION_FAILED')
      expect(empty.body.error.fieldErrors[0].field).toBe('csv')

      expect((await preview(owner, {})).status).toBe(422)
      expect((await preview(owner, { csv: 'Title\n' })).body.error.fieldErrors[0].message).toBe(
        'The file has a header line but no rows.',
      )
    })

    it('treats someone who is no longer a member as unknown', async () => {
      await prisma.projectMember.delete({ where: { projectId_userId: { projectId: project.id, userId: sara.id } } })
      const res = await preview(owner, { csv: 'Title,Assignee\nA,sara', mapping: ['title', 'assignees'] })
      expect(res.body.rows[0].errors).toEqual([{ field: 'assignees', message: 'sara is not a member of this project.' }])
    })

    it('accepts a file larger than the usual request limit', async () => {
      const rows = Array.from({ length: 400 }, (_, index) => `Task ${index},${'x'.repeat(400)}`)
      const big = ['Title,Description', ...rows].join('\n')
      expect(big.length).toBeGreaterThan(150_000)
      const res = await preview(owner, { csv: big, mapping: ['title', 'description'] })
      expect(res.status).toBe(200)
      expect(res.body.validCount).toBe(400)
    })
  })

  describe('who can import', () => {
    it('lets only the owner import', async () => {
      const member = await preview(sara, { csv })
      expect(member.status).toBe(403)
      expect(member.body.error.message).toBe('Only the project owner can import tasks.')
      expect((await confirm(sara, { csv, mapping })).status).toBe(403)
      expect((await preview(omar, { csv })).status).toBe(404)
      expect((await request(app).post(`/api/projects/${project.id}/imports/preview`).send({ csv })).status).toBe(401)
    })

    it('refuses an archived project', async () => {
      await prisma.project.update({ where: { id: project.id }, data: { archivedAt: new Date(), archivedById: owner.id } })
      expect((await preview(owner, { csv })).status).toBe(410)
      expect((await confirm(owner, { csv, mapping })).status).toBe(410)
    })
  })

  describe('confirm', () => {
    it('creates only the valid rows, at the end of their columns, with log entries and notifications', async () => {
      await prisma.task.create({
        data: { projectId: project.id, title: 'Existing', status: 'DONE', position: 4, createdById: owner.id },
      })

      const res = await confirm(owner, { csv, mapping })
      expect(res.status).toBe(201)
      expect(res.body).toMatchObject({ createdCount: 3, skippedCount: 2 })
      expect(res.body.taskIds).toHaveLength(3)

      const tasks = await prisma.task.findMany({
        where: { id: { in: res.body.taskIds } },
        include: { assignees: true },
        orderBy: { createdAt: 'asc' },
      })
      const byTitle = Object.fromEntries(tasks.map((task) => [task.title, task]))
      expect(byTitle['Write the report']).toMatchObject({
        description: 'First draft',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        position: 1,
        createdById: owner.id,
      })
      expect(byTitle['Write the report'].dueDate.toISOString()).toBe('2026-12-01T00:00:00.000Z')
      expect(byTitle['Write the report'].assignees.map((a) => a.userId)).toEqual([sara.id])
      expect(byTitle['Book the room']).toMatchObject({ status: 'TODO', priority: null, dueDate: null, position: 1 })
      expect(byTitle['Book the room'].assignees.map((a) => a.userId)).toEqual([owner.id])
      expect(byTitle['Fix the footer']).toMatchObject({ status: 'DONE', position: 5 })
      expect(byTitle['Fix the footer'].assignees.map((a) => a.userId).sort()).toEqual([owner.id, sara.id].sort())

      const events = await prisma.activityEvent.findMany({ where: { projectId: project.id } })
      expect(events).toHaveLength(3)
      expect(events.every((event) => event.type === 'TASK_CREATED' && event.details.imported === true)).toBe(true)
      expect(events.find((event) => event.taskTitle === 'Write the report').details).toMatchObject({
        status: 'IN_PROGRESS',
        assignees: ['sara'],
      })

      // Sara is notified for her two tasks; the owner imported them, so the owner is not.
      const notifications = await prisma.notification.findMany()
      expect(notifications).toHaveLength(2)
      expect(notifications.every((n) => n.userId === sara.id && n.type === 'TASK_ASSIGNED')).toBe(true)
    })

    it('keeps the file order within a column', async () => {
      const text = 'Title\nFirst\nSecond\nThird'
      await confirm(owner, { csv: text, mapping: ['title'] })
      const tasks = await prisma.task.findMany({ where: { projectId: project.id }, orderBy: { position: 'asc' } })
      expect(tasks.map((task) => [task.title, task.position])).toEqual([
        ['First', 1],
        ['Second', 2],
        ['Third', 3],
      ])
    })

    it('creates nothing when no row is ready', async () => {
      const res = await confirm(owner, { csv: 'Title,Stage\n,Done\nA,Later', mapping: ['title', 'status'] })
      expect(res.status).toBe(422)
      expect(res.body.error.fieldErrors[0].field).toBe('csv')
      expect(await prisma.task.count()).toBe(0)
    })

    it('needs a mapping', async () => {
      const res = await confirm(owner, { csv })
      expect(res.status).toBe(422)
      expect(res.body.error.fieldErrors[0].field).toBe('mapping')
      expect(await prisma.task.count()).toBe(0)
    })
  })
})
