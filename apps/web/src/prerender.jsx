// Build-time entry for scripts/prerender.mjs: renders the public landing page to HTML.
import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router'
import LandingPage from './features/landing/LandingPage.jsx'

export function render() {
  return renderToString(
    <StaticRouter location="/">
      <LandingPage />
    </StaticRouter>,
  )
}
