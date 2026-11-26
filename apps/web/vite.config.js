import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // scripts/prerender.mjs reads the manifest to link the landing page's files, then deletes it.
  build: { manifest: true },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
  },
})
