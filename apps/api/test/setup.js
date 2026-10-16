// Runs before each test file.
import dotenv from 'dotenv'
import { vi } from 'vitest'

dotenv.config({ quiet: true })
// Tests use the test schema, never the development data.
if (process.env.TEST_DATABASE_URL) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL

// Fake Supabase: the token "test:<authId>:<email>" is valid; anything else is not.
vi.mock('../src/auth/verifyToken.js', () => ({
  verifyToken: async (token) => {
    const [prefix, authId, email] = token.split(':')
    return prefix === 'test' && authId && email ? { authId, email } : null
  },
}))
