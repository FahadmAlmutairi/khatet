import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './app/App.jsx'
import { useRealAuth } from './api/config.js'
import { warmUpApi } from './api/realAuth.js'
import { loadLandingPage } from './app/lazyPages.js'
import { hasSavedSession, removeStaticLanding } from './app/staticLanding.js'
import '@fontsource-variable/inter'
import './styles/index.css'

// Wake the API while the page and the saved session load, not after.
if (useRealAuth) warmUpApi()
// Visitors usually arrive at /, where the landing page is shown to anyone not signed in.
if (window.location.pathname === '/') loadLandingPage()
// index.html carries a prerendered copy of the landing page (app/staticLanding.js). It is only
// for signed-out visitors at /; everyone else goes straight to the app.
if (window.location.pathname !== '/' || hasSavedSession()) removeStaticLanding()
// Only the landing page belongs in search results. Vercel's SPA fallback does not apply
// per-path headers, so sign-in, demo and app pages ask search engines not to index them here.
if (window.location.pathname !== '/') {
  const robots = document.createElement('meta')
  robots.name = 'robots'
  robots.content = 'noindex'
  document.head.append(robots)
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
