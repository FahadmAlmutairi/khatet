// The browser's Supabase client. It is used only to sign in; project data always goes
// through the Express API (docs/architecture.md). The publishable key is safe in the
// browser because every table has Row Level Security turned on.
import { createClient } from '@supabase/supabase-js'
import { supabaseKey, supabaseUrl } from './config.js'

let client

// The current access token, kept in memory so a request sent while the page closes can go out
// at once, without waiting on getSession() (review H2).
let accessToken = null

export function supabase() {
  if (!client) {
    client = createClient(supabaseUrl, supabaseKey)
    client.auth.onAuthStateChange((_event, session) => {
      accessToken = session?.access_token ?? null
    })
  }
  return client
}

export function cachedAccessToken() {
  return accessToken
}
