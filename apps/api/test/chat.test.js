import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import request from 'supertest'
import { randomUUID } from 'node:crypto'
import app from '../src/app.js'
import { prisma } from '../src/db.js'
import { LIST_LIMIT, MAX_TEXT_LENGTH } from '../src/chat/routes.js'
import { authHeader, createProject, createUser, hasTestDatabase, resetDatabase } from './helpers.js'

describe.skipIf(!hasTestDatabase)('US-24: project chat', () => {
  let owner, viewer, outsider, project

  beforeEach(async () => {
    await resetDatabase()
    owner = await createUser('owner_user')
    viewer = await createUser('viewer')
    outsider = await createUser('outsider')
    project = await createProject(owner, [{ user: viewer, taskAccess: 'VIEW_ONLY' }])
  })
  afterAll(() => prisma.$disconnect())

  const url = () => `/api/projects/${project.id}/messages`

  function addMessage(author, text, createdAt) {
    return prisma.chatMessage.create({ data: { projectId: project.id, authorId: author.id, text, createdAt } })
  }

  it('lets any member send a message, even with view-only task access', async () => {
    const res = await request(app).post(url()).set(authHeader(viewer)).send({ text: '  Hello team  ' })
    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({
      projectId: project.id,
      authorId: viewer.id,
      authorUsername: 'viewer',
      text: 'Hello team',
    })
    expect(res.body.id).toBeTruthy()
    expect(res.body.createdAt).toBeTruthy()
  })

  it('lists messages oldest first with the author username', async () => {
    await addMessage(owner, 'Second', new Date('2026-11-02'))
    await addMessage(viewer, 'First', new Date('2026-11-01'))
    const res = await request(app).get(url()).set(authHeader(owner))
    expect(res.status).toBe(200)
    expect(res.body.map((m) => m.text)).toEqual(['First', 'Second'])
    expect(res.body[0].authorUsername).toBe('viewer')
  })

  it('returns an empty list for a project without messages', async () => {
    const res = await request(app).get(url()).set(authHeader(owner))
    expect(res.body).toEqual([])
  })

  it('returns only the latest messages when there are many', async () => {
    const start = Date.parse('2026-11-01T00:00:00Z')
    await prisma.chatMessage.createMany({
      data: Array.from({ length: LIST_LIMIT + 5 }, (_, i) => ({
        projectId: project.id,
        authorId: owner.id,
        text: `Message ${i}`,
        createdAt: new Date(start + i * 1000),
      })),
    })
    const res = await request(app).get(url()).set(authHeader(owner))
    expect(res.body).toHaveLength(LIST_LIMIT)
    expect(res.body[0].text).toBe('Message 5')
    expect(res.body.at(-1).text).toBe(`Message ${LIST_LIMIT + 4}`)
  })

  it('returns only the messages after the cursor', async () => {
    const first = await addMessage(owner, 'First', new Date('2026-11-01'))
    await addMessage(viewer, 'Second', new Date('2026-11-02'))
    await addMessage(owner, 'Third', new Date('2026-11-03'))
    const res = await request(app).get(`${url()}?after=${first.id}`).set(authHeader(viewer))
    expect(res.status).toBe(200)
    expect(res.body.map((m) => m.text)).toEqual(['Second', 'Third'])

    const latest = res.body.at(-1).id
    const none = await request(app).get(`${url()}?after=${latest}`).set(authHeader(viewer))
    expect(none.body).toEqual([])
  })

  it('keeps messages sent in the same millisecond in a stable order', async () => {
    const at = new Date('2026-11-01T10:00:00Z')
    const a = await addMessage(owner, 'A', at)
    const b = await addMessage(owner, 'B', at)
    const [earlier, later] = a.id < b.id ? [a, b] : [b, a]
    const res = await request(app).get(`${url()}?after=${earlier.id}`).set(authHeader(owner))
    expect(res.body.map((m) => m.id)).toEqual([later.id])
  })

  it('refuses a cursor that is not a message in this project', async () => {
    const other = await createProject(outsider)
    const foreign = await prisma.chatMessage.create({ data: { projectId: other.id, authorId: outsider.id, text: 'Hidden' } })
    for (const after of [foreign.id, randomUUID(), 'not-an-id']) {
      const res = await request(app).get(`${url()}?after=${after}`).set(authHeader(owner))
      expect(res.status).toBe(422)
      expect(res.body.error.fieldErrors[0].field).toBe('after')
    }
  })

  it('refuses an empty message with 422', async () => {
    for (const body of [{ text: '' }, { text: '   ' }, {}, { text: 42 }]) {
      const res = await request(app).post(url()).set(authHeader(owner)).send(body)
      expect(res.status).toBe(422)
      expect(res.body.error.code).toBe('VALIDATION_FAILED')
      expect(res.body.error.fieldErrors[0].field).toBe('text')
    }
    expect(await prisma.chatMessage.count()).toBe(0)
  })

  it('refuses a message that is too long', async () => {
    const res = await request(app).post(url()).set(authHeader(owner)).send({ text: 'a'.repeat(MAX_TEXT_LENGTH + 1) })
    expect(res.status).toBe(422)
    const ok = await request(app).post(url()).set(authHeader(owner)).send({ text: 'a'.repeat(MAX_TEXT_LENGTH) })
    expect(ok.status).toBe(201)
  })

  it('hides the chat from people outside the project (NFR-11)', async () => {
    await addMessage(owner, 'Members only')
    const read = await request(app).get(url()).set(authHeader(outsider))
    expect(read.status).toBe(404)
    const send = await request(app).post(url()).set(authHeader(outsider)).send({ text: 'Hi' })
    expect(send.status).toBe(404)
    expect(await prisma.chatMessage.count()).toBe(1)
  })

  it('answers 404 for a project that does not exist', async () => {
    const res = await request(app).get(`/api/projects/${randomUUID()}/messages`).set(authHeader(owner))
    expect(res.status).toBe(404)
  })

  it('requires sign-in and a username', async () => {
    const anonymous = await request(app).get(url())
    expect(anonymous.status).toBe(401)
    const noName = await createUser(null)
    const res = await request(app).get(url()).set(authHeader(noName))
    expect(res.status).toBe(403)
    expect(res.body.error.code).toBe('USERNAME_REQUIRED')
  })

  it('deletes the messages with the project', async () => {
    await addMessage(owner, 'Bye')
    await prisma.project.delete({ where: { id: project.id } })
    expect(await prisma.chatMessage.count()).toBe(0)
  })
})
