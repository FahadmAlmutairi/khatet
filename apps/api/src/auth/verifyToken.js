// Asks Supabase Auth whether an access token is valid and who it belongs to.
// The only file that talks to Supabase Auth (docs/architecture.md, Future readiness).
// Tests replace this module with a fake (test/setup.js).
import { createClient } from '@supabase/supabase-js'
import { config } from '../config.js'

let supabase

function client() {
  if (!supabase) {
    if (!config.supabaseUrl || !config.supabaseKey) {
      throw new Error('SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY must be set (see .env.example).')
    }
    supabase = createClient(config.supabaseUrl, config.supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })
  }
  return supabase
}

// Returns { authId, email } for a valid token, or null.
export async function verifyToken(token) {
  if (config.devFakeAuth && token.startsWith('dev:')) {
    const [, authId, email] = token.split(':')
    return authId && email ? { authId, email: email.toLowerCase() } : null
  }
  const { data, error } = await client().auth.getUser(token)
  if (error || !data?.user?.email) return null
  return { authId: data.user.id, email: data.user.email.toLowerCase() }
}
