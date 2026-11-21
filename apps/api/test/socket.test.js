// TR-05: project chat over Socket.IO (docs/api-contract.md, Chat contract).
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { createServer } from 'node:http'
import request from 'supertest'
import { io as connect } from 'socket.io-client'
import app from '../src/app.js'
import { prisma } from '../src/db.js'
import { attachSocket, closeSocket } from '../src/realtime/socket.js'
import { authHeader, createProject, createUser, hasTestDatabase, resetDatabase } from './helpers.js'

describe.skipIf(!hasTestDatabase)('TR-05: chat over Socket.IO', () => {
  let server, address, owner, member, outsider, project
  const clients = []

  beforeAll(async () => {
    server = createServer(app)
    attachSocket(server)
    await new Promise((resolve) => server.listen(0, resolve))
    address = `http://127.0.0.1:${server.address().port}`
  })
  afterAll(async () => {
    await closeSocket()
    await new Promise((resolve) => server.close(resolve))
    await prisma.$disconnect()
  })

  beforeEach(async () => {
    await resetDatabase()
    owner = await createUser('owner_user')
    member = await createUser('member')
    outsider = await createUser('outsider')
    project = await createProject(owner, [{ user: member }])
  })
  afterEach(() => {
    while (clients.length) clients.pop().disconnect()
  })

  function open(user, token = `test:${user.authId}:${user.email}`) {
    const socket = connect(address, { auth: { token }, transports: ['websocket'], reconnection: false, forceNew: true })
    clients.push(socket)
    return socket
  }
  const connected = (socket) =>
    new Promise((resolve, reject) => {
      socket.once('connect', resolve)
      socket.once('connect_error', reject)
    })
  const join = (socket, projectId) => socket.timeout(5000).emitWithAck('chat:join', { projectId })
  const nextMessage = (socket) => new Promise((resolve) => socket.once('message:new', resolve))
  const post = (user, text) =>
    request(app).post(`/api/projects/${project.id}/messages`).set(authHeader(user)).send({ text })

  it('sends a new message to every member in the room with the REST shape', async () => {
    const socket = open(member)
    await connected(socket)
    expect(await join(socket, project.id)).toEqual({ ok: true })

    const arriving = nextMessage(socket)
    const res = await post(owner, 'Hello over the socket')
    expect(res.status).toBe(201)
    expect(await arriving).toEqual(JSON.parse(JSON.stringify(res.body)))
  })

  it('refuses the room to someone outside the project', async () => {
    const socket = open(outsider)
    await connected(socket)
    const answer = await join(socket, project.id)
    expect(answer).toMatchObject({ ok: false, error: { code: 'NOT_FOUND' } })

    let received = false
    socket.on('message:new', () => (received = true))
    await post(owner, 'Members only')
    await new Promise((resolve) => setTimeout(resolve, 200))
    expect(received).toBe(false)
  })

  it('refuses a connection without a valid token or a username', async () => {
    await expect(connected(open(member, 'wrong'))).rejects.toThrow('UNAUTHENTICATED')
    const noName = await createUser(null)
    await expect(connected(open(noName))).rejects.toThrow('USERNAME_REQUIRED')
  })

  it('stops sending after chat:leave', async () => {
    const socket = open(member)
    await connected(socket)
    await join(socket, project.id)
    await socket.timeout(5000).emitWithAck('chat:leave', { projectId: project.id })

    let received = false
    socket.on('message:new', () => (received = true))
    await post(owner, 'After leaving')
    await new Promise((resolve) => setTimeout(resolve, 200))
    expect(received).toBe(false)
  })

  it('takes a removed member out of the room', async () => {
    const socket = open(member)
    await connected(socket)
    await join(socket, project.id)
    const removed = await request(app)
      .delete(`/api/projects/${project.id}/members/${member.id}`)
      .set(authHeader(owner))
    expect(removed.status).toBe(200)

    let received = false
    socket.on('message:new', () => (received = true))
    await post(owner, 'After removal')
    await new Promise((resolve) => setTimeout(resolve, 200))
    expect(received).toBe(false)
  })
})
