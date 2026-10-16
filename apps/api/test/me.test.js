import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import request from 'supertest'
import { randomUUID } from 'node:crypto'
import app from '../src/app.js'
import { prisma } from '../src/db.js'
import { authHeader, createUser, hasTestDatabase, resetDatabase, tokenFor } from './helpers.js'

describe('authentication', () => {
  it('refuses a request without a token', async () => {
    const res = await request(app).get('/api/me')
    expect(res.status).toBe(401)
    expect(res.body.error.code).toBe('UNAUTHENTICATED')
    expect(res.body.error.requestId).toBeTruthy()
  })

  it('refuses an invalid token', async () => {
    const res = await request(app).get('/api/me').set('Authorization', 'Bearer not-a-real-token')
    expect(res.status).toBe(401)
  })
})

describe.skipIf(!hasTestDatabase)('US-01 and US-02: GET and PATCH /api/me', () => {
  beforeEach(resetDatabase)
  afterAll(() => prisma.$disconnect())

  it('creates the account on first sign-in, without a username', async () => {
    const res = await request(app).get('/api/me').set(tokenFor(randomUUID(), 'new@test.dev'))
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ email: 'new@test.dev', username: null })
    expect(await prisma.user.count()).toBe(1)
  })

  it('returns the same account when the user signs in again', async () => {
    const header = tokenFor(randomUUID(), 'again@test.dev')
    const first = await request(app).get('/api/me').set(header)
    const second = await request(app).get('/api/me').set(header)
    expect(second.body.id).toBe(first.body.id)
    expect(await prisma.user.count()).toBe(1)
  })

  it('lets a new user choose a username', async () => {
    const user = await createUser(null)
    const res = await request(app).patch('/api/me').set(authHeader(user)).send({ username: '@Salman_1' })
    expect(res.status).toBe(200)
    expect(res.body.username).toBe('salman_1')
  })

  it('refuses a username with the wrong format', async () => {
    const user = await createUser(null)
    const res = await request(app).patch('/api/me').set(authHeader(user)).send({ username: 'ab' })
    expect(res.status).toBe(422)
    expect(res.body.error.fieldErrors[0].field).toBe('username')
  })

  it('refuses a username another user has, with a message', async () => {
    await createUser('taken_name')
    const user = await createUser(null)
    const res = await request(app).patch('/api/me').set(authHeader(user)).send({ username: 'taken_name' })
    expect(res.status).toBe(422)
    expect(res.body.error.fieldErrors[0].message).toMatch(/taken/)
  })

  it('allows a username change only once every 30 days', async () => {
    const user = await createUser('first_name')
    await prisma.user.update({ where: { id: user.id }, data: { usernameChangedAt: new Date() } })
    const res = await request(app).patch('/api/me').set(authHeader(user)).send({ username: 'second_name' })
    expect(res.status).toBe(422)
  })
})
