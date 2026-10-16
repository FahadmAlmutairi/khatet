// Loads apps/api/.env on your computer. On Render the same settings come from
// the service's Environment page, and there is no .env file.
import dotenv from 'dotenv'

dotenv.config({ quiet: true })

export const config = {
  port: Number(process.env.PORT) || 3000,
}
