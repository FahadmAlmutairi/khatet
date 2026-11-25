import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './app/App.jsx'
import { useRealAuth } from './api/config.js'
import { warmUpApi } from './api/realAuth.js'
import { loadLandingPage } from './app/lazyPages.js'
import '@fontsource-variable/inter'
import './styles/index.css'

// Wake the API while the page and the saved session load, not after.
if (useRealAuth) warmUpApi()
// Visitors usually arrive at /, where the landing page is shown to anyone not signed in.
if (window.location.pathname === '/') loadLandingPage()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
