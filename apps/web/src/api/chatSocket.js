// TR-05: project chat over Socket.IO, with the 3-second refresh kept as the fallback.
//
// The events the client expects from the server side (Hamzah), also in docs/api-contract.md:
// - The client connects to the API's address and sends its Supabase access token in the
//   handshake (`auth.token`), read again on every reconnect so an expired token is not reused.
// - `chat:join` with `{ projectId }` asks to join the project's room. The server checks membership
//   with the shared policy module and answers through the acknowledgement: `{ ok: true }`, or
//   `{ ok: false, error: { code, message } }`. `chat:leave` with `{ projectId }` leaves it.
// - After `POST /messages` saves a message, the server emits `message:new` to the room with the
//   same message shape as the REST routes. Messages are still stored and loaded through REST.
import { apiReady, apiUrl, useRealAuth } from './config.js'
import { supabase } from './supabase.js'

// The socket is used only against the real API, and only once the server side is merged.
export const chatSocketEnabled = useRealAuth && apiReady.chatSocket

let socketPromise = null

// socket.io-client loads on the first open chat, so it stays out of the first download.
export function getChatSocket() {
  socketPromise ??= import('socket.io-client').then(({ io }) =>
    io(apiUrl, {
      autoConnect: false,
      // Polling first, then the upgrade to WebSocket, so a sleeping Render server is woken by the
      // first request instead of a WebSocket that fails fast.
      transports: ['polling', 'websocket'],
      auth: (send) => {
        supabase()
          .auth.getSession()
          .then(({ data }) => send({ token: data.session?.access_token ?? null }))
          .catch(() => send({ token: null }))
      },
    }),
  )
  return socketPromise
}

// Asks to join a project's room; resolves to true once the server says yes.
export function joinProjectRoom(target, projectId, timeoutMs = 5000) {
  return new Promise((resolve) => {
    target.timeout(timeoutMs).emit('chat:join', { projectId }, (error, answer) => {
      resolve(!error && answer?.ok === true)
    })
  })
}
