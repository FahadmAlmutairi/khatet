import { QueryClient } from '@tanstack/react-query'
import { ApiError } from '../api/errors.js'

// A 4xx answer (not found, no access, invalid input) will not change on retry.
function shouldRetry(failureCount, error) {
  if (error instanceof ApiError && error.status < 500) return false
  return failureCount < 1
}

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: shouldRetry,
      },
      mutations: {
        // Writes are not retried automatically unless the API contract makes retry safe.
        retry: 0,
      },
    },
  })
}
