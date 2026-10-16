// Runs once before all tests: rebuilds the test database from the Prisma migrations
// (docs/architecture.md, Test environment). TEST_DATABASE_URL must point to a
// separate schema (?schema=test), because everything in it is deleted.
import dotenv from 'dotenv'
import { execSync } from 'node:child_process'

export default function setup() {
  dotenv.config({ quiet: true })
  const url = process.env.TEST_DATABASE_URL
  if (!url) {
    console.warn('TEST_DATABASE_URL is not set, so the database tests are skipped.')
    return
  }
  if (!/[?&]schema=(?!public\b)\w+/.test(url)) {
    throw new Error('TEST_DATABASE_URL must use its own schema, for example ?schema=test')
  }
  execSync('npx prisma migrate reset --force --skip-seed --skip-generate', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: url, DIRECT_URL: url },
  })
}
