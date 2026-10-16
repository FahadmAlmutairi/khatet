// The browser's Supabase client. It is used only to sign in; project data always goes
// through the Express API (docs/architecture.md). The publishable key is safe in the
// browser because every table has Row Level Security turned on.
import { createClient } from '@supabase/supabase-js'
import { supabaseKey, supabaseUrl } from './config.js'

let client

export function supabase() {
  if (!client) client = createClient(supabaseUrl, supabaseKey)
  return client
}
