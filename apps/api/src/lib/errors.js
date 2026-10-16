// One error shape for every failed request (docs/api-contract.md, Errors):
// { "error": { "code", "message", "fieldErrors", "requestId" } }
// `message` is safe to show to users; `code` is what the frontend checks.
import { randomUUID } from 'node:crypto'

export class ApiError extends Error {
  constructor(status, code, message, fieldErrors = []) {
    super(message)
    this.status = status
    this.code = code
    this.fieldErrors = fieldErrors
  }
}

export const unauthenticated = (message = 'Your session has ended. Sign in again.') =>
  new ApiError(401, 'UNAUTHENTICATED', message)

export const forbidden = (message) => new ApiError(403, 'FORBIDDEN', message)

export const notFound = (message) => new ApiError(404, 'NOT_FOUND', message)

export const invalid = (fieldErrors, message = 'Check the highlighted fields.') =>
  new ApiError(422, 'VALIDATION_FAILED', message, fieldErrors)

// Gives every request an ID that appears in error responses and server logs.
export function requestId(req, res, next) {
  req.id = randomUUID()
  res.set('X-Request-Id', req.id)
  next()
}

export function routeNotFound(req, res, next) {
  next(new ApiError(404, 'ROUTE_NOT_FOUND', 'This address does not exist.'))
}

// Express 5 sends errors thrown in async routes here automatically.
export function errorHandler(error, req, res, _next) {
  if (error instanceof ApiError) {
    return res.status(error.status).json({
      error: { code: error.code, message: error.message, fieldErrors: error.fieldErrors, requestId: req.id },
    })
  }
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: { code: 'INVALID_JSON', message: 'The request body is not valid JSON.', fieldErrors: [], requestId: req.id },
    })
  }
  console.error(`[${req.id}]`, error)
  res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'Something went wrong. Try again.', fieldErrors: [], requestId: req.id },
  })
}
