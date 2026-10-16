import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globalSetup: './test/globalSetup.js',
    setupFiles: ['./test/setup.js'],
    // Database tests share one test database, so test files run one at a time.
    fileParallelism: false,
    // Each database call goes over the internet to Supabase, so allow more than the default 5 seconds.
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
})
