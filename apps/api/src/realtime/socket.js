// TR-05: project chat over Socket.IO (docs/api-contract.md, Chat contract; D-010).
// Socket.IO runs on the same HTTP server as Express. The client sends its Supabase access token in
// the handshake (`auth.token`), which is checked like the Authorization header on REST requests.
// - `chat:join` with `{ projectId }` joins the room `project:<projectId>` after the same membership
//   check as the REST routes (projects/access.js). The acknowledgement is `{ ok: true }`, or
//   `{ ok: false, error: { code, message } }`.
// - `chat:leave` with `{ projectId }` leaves the room.
// - After POST /messages saves a message, the server emits `message:new` to the room with the same
//   message object the REST routes return (chat/routes.js).
// Messages are still stored and loaded through REST, and the web app goes back to refreshing every
// 3 seconds while the socket is not connected, so chat keeps working without it.
import { Server } from 'socket.io'
import { config } from '../config.js'
import { findOrCreateUser } from '../auth/requireAuth.js'
import { verifyToken } from '../auth/verifyToken.js'
import { ApiError } from '../lib/errors.js'
import { findMembership } from '../projects/access.js'

let io = null

export const roomFor = (projectId) => `project:${projectId}`

function failure(code, message) {
  return { ok: false, error: { code, message } }
}

// Checks the handshake token and puts the signed-in Khatet user on socket.data.user.
async function authenticate(socket, next) {
  try {
    const token = socket.handshake.auth?.token
    const identity = typeof token === 'string' && token ? await verifyToken(token) : null
    if (!identity) return next(new Error('UNAUTHENTICATED'))
    const user = await findOrCreateUser(identity)
    if (!user.username) return next(new Error('USERNAME_REQUIRED'))
    socket.data.user = user
    next()
  } catch {
    next(new Error('UNAUTHENTICATED'))
  }
}

function onConnection(socket) {
  socket.on('chat:join', async (payload, ack) => {
    const reply = typeof ack === 'function' ? ack : () => {}
    try {
      const { projectId } = await findMembership(payload?.projectId, socket.data.user.id)
      await socket.join(roomFor(projectId))
      reply({ ok: true })
    } catch (error) {
      if (error instanceof ApiError) return reply(failure(error.code, error.message))
      console.error('chat:join failed', error)
      reply(failure('INTERNAL_ERROR', 'Could not join the project chat. Try again.'))
    }
  })

  socket.on('chat:leave', async (payload, ack) => {
    if (typeof payload?.projectId === 'string') await socket.leave(roomFor(payload.projectId))
    if (typeof ack === 'function') ack({ ok: true })
  })
}

// Starts Socket.IO on the HTTP server that Express listens on (server.js).
export function attachSocket(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: config.corsOrigins },
    // Polling first, then the upgrade to WebSocket, as the web client asks (apps/web/src/api/chatSocket.js).
    transports: ['polling', 'websocket'],
  })
  io.use(authenticate)
  io.on('connection', onConnection)
  return io
}

// Sends an event to everyone in a project's room. Does nothing when Socket.IO is not running (tests
// of the REST routes alone).
export function emitToProject(projectId, event, payload) {
  io?.to(roomFor(projectId)).emit(event, payload)
}

// Takes a person out of a project's room once they are no longer a member (removed, left or the
// project is gone), so they stop receiving its messages without waiting for a reconnect.
export async function removeFromProjectRoom(projectId, userId) {
  if (!io) return
  const sockets = await io.in(roomFor(projectId)).fetchSockets()
  for (const socket of sockets) {
    if (userId === undefined || socket.data.user?.id === userId) socket.leave(roomFor(projectId))
  }
}

export function closeSocket() {
  const closing = io
  io = null
  return closing ? closing.close() : Promise.resolve()
}
