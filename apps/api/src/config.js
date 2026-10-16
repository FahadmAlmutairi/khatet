// Loads apps/api/.env on your computer. On Render the same settings come from
// the service's Environment page, and there is no .env file.
import dotenv from 'dotenv'

dotenv.config({ quiet: true })

export const config = {
  port: Number(process.env.PORT) || 3000,
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_PUBLISHABLE_KEY,
  // Comma-separated list of sites allowed to call the API from a browser.
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  // Development only: accept "dev:<authId>:<email>" tokens so you can try the API
  // as the seed users without signing in. Never set this on Render.
  devFakeAuth: process.env.DEV_FAKE_AUTH === 'true' && process.env.NODE_ENV !== 'production',
}
