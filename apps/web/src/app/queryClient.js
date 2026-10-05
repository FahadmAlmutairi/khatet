import { QueryClient } from '@tanstack/react-query'

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: 1,
      },
      mutations: {
        // Writes are not retried automatically unless the API contract makes retry safe.
        retry: 0,
      },
    },
  })
}
