// One typed error for every failed request, following the error shape in
// docs/api-contract.md: `message` is safe to show, `code` drives behaviour.
export class ApiError extends Error {
  constructor({ code, message, status = 400, fieldErrors = [], nextAllowedAt = null }) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
    this.fieldErrors = fieldErrors
    // US-31: 429 REPORT_TOO_SOON says when the next report can be generated (ISO date and time).
    this.nextAllowedAt = nextAllowedAt
  }
}

export function fieldError(error, field) {
  return error?.fieldErrors?.find((item) => item.field === field)?.message
}

export function errorMessage(error, fallback = 'Something went wrong. Try again.') {
  return error instanceof ApiError ? error.message : fallback
}
