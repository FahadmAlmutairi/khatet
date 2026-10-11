// Sprint 1 screens run on sample data until the Express routes are merged.
// Each function here will become a fetch call to the documented endpoint.
// deleteTask must use fetch(..., { keepalive: true }): a delete waiting out its Undo time
// is sent when the page is left (Toast.jsx, pagehide), and a plain request is cancelled then.
import * as sample from './mockServer.js'

export const api = sample
