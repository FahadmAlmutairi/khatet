import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import request from 'supertest'
import app from '../src/app.js'
import { prisma } from '../src/db.js'
import { authHeader, createProject, createUser, hasTestDatabase, resetDatabase } from './helpers.js'

describe.skipIf(!hasTestDatabase)('US-04 to US-06: projects', () => {
  beforeEach(resetDatabase)
  afterAll(() => prisma.$disconnect())

  it('creates a project with its creator as the owner, and lists it', async () => {
    const user = await createUser('maker')
    const created = await request(app).post('/api/projects').set(authHeader(user)).send({ name: ' Khatet ' })
    expect(created.status).toBe(201)
    expect(created.body).toMatchObject({ name: 'Khatet', role: 'OWNER' })

    const list = await request(app).get('/api/projects').set(authHeader(user))
    expect(list.body.map((p) => p.id)).toEqual([created.body.id])
  })

  it('opens a project only for its members', async () => {
    const owner = await createUser('owner_user')
    const outsider = await createUser('outsider')
    const project = await createProject(owner)
    expect((await request(app).get(`/api/projects/${project.id}`).set(authHeader(owner))).status).toBe(200)
    expect((await request(app).get(`/api/projects/${project.id}`).set(authHeader(outsider))).status).toBe(404)
  })

  it('answers not found, not a server error, to an ID that is not a UUID', async () => {
    const user = await createUser('maker')
    const res = await request(app).get('/api/projects/abc').set(authHeader(user))
    expect(res.status).toBe(404)
    expect(res.body.error.code).toBe('NOT_FOUND')
  })
})
