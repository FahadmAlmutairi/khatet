// Runs after `vite build` and `vite build --ssr src/prerender.jsx`. Puts the landing page's HTML
// into dist/index.html (as #landing-static, before #root), with the landing page's stylesheet
// and script linked, so the page can be read and shown before the app's JavaScript runs.
import { readFile, rm, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const dist = `${root}dist`
const ssrDir = `${root}dist-ssr`

const { render } = await import(`${ssrDir}/prerender.js`)
const manifest = JSON.parse(await readFile(`${dist}/.vite/manifest.json`, 'utf8'))

// The landing page is a lazy chunk; link its CSS (and the CSS of anything it imports) and preload its code.
const landing = manifest['src/features/landing/LandingPage.jsx']
if (!landing) throw new Error('prerender: the landing page chunk is missing from the build manifest')
const css = new Set()
const scripts = new Set([landing.file])
const seen = new Set()
function collect(key) {
  if (seen.has(key)) return
  seen.add(key)
  const chunk = manifest[key]
  for (const file of chunk.css ?? []) css.add(file)
  for (const child of chunk.imports ?? []) {
    scripts.add(manifest[child].file)
    collect(child)
  }
}
collect('src/features/landing/LandingPage.jsx')

const html = await readFile(`${dist}/index.html`, 'utf8')
// Files the entry already links (the app's own CSS and shared chunks) are not added twice.
const missing = (file) => !html.includes(`/${file}"`)
const head = [
  ...[...css].filter(missing).map((file) => `<link rel="stylesheet" crossorigin href="/${file}">`),
  ...[...scripts].filter(missing).map((file) => `<link rel="modulepreload" crossorigin href="/${file}">`),
].join('\n    ')

if (!html.includes('<div id="root"></div>')) throw new Error('prerender: <div id="root"></div> not found in index.html')
const output = html
  .replace('</head>', `  ${head}\n  </head>`)
  .replace('<div id="root"></div>', `<div id="landing-static">${render()}</div>\n    <div id="root"></div>`)

await writeFile(`${dist}/index.html`, output)
// The manifest and server bundle are only needed here; keep them off the live site.
await rm(`${dist}/.vite`, { recursive: true, force: true })
await rm(ssrDir, { recursive: true, force: true })
console.log('prerender: landing page written into dist/index.html')
