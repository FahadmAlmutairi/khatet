import app from './app.js'
import { config } from './config.js'

const server = app.listen(config.port, () => {
  console.log(`Khatet API running on http://localhost:${config.port}`)
})

// Keep idle connections open longer than clients and proxies (Render, Windows
// PowerShell) expect, so they never reuse a connection the server already closed.
server.keepAliveTimeout = 65_000
server.headersTimeout = 66_000
