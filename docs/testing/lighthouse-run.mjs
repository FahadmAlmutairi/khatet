// Runs Lighthouse on the Sprint 1 pages of a local `vite preview` build.
// The sample API keeps the session in sessionStorage, so each run uses one tab that is
// signed in first and Lighthouse is told not to clear storage.
import fs from 'node:fs'
import path from 'node:path'
import puppeteer from 'puppeteer-core'
import lighthouse from 'lighthouse'
import desktopConfig from 'lighthouse/core/config/desktop-config.js'

const BASE = process.argv[2]
const OUT = process.argv[3]
fs.mkdirSync(OUT, { recursive: true })

const pages = [
  { key: 'sign-in', path: '/sign-in', signedIn: false },
  { key: 'home', path: '/projects', signedIn: true },
  { key: 'board', path: '/projects/p-khatet/board', signedIn: true },
  { key: 'task-details', path: '/projects/p-khatet/board?task=t-6', signedIn: true },
  { key: 'members', path: '/projects/p-khatet/members', signedIn: true },
]

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox', '--headless=new'],
})

const summary = []
for (const form of ['mobile', 'desktop']) {
  for (const p of pages) {
    const page = await browser.newPage()
    await page.goto(BASE + '/sign-in')
    await page.evaluate((signedIn) => {
      if (signedIn) sessionStorage.setItem('khatet.sampleSession', 'u-fahad')
      else sessionStorage.removeItem('khatet.sampleSession')
    }, p.signedIn)
    const config = form === 'desktop' ? desktopConfig : undefined
    const result = await lighthouse(
      BASE + p.path,
      { output: 'html', logLevel: 'error', disableStorageReset: true },
      config,
      page,
    )
    fs.writeFileSync(path.join(OUT, `${form}-${p.key}.html`), result.report)
    const c = result.lhr.categories
    const a = result.lhr.audits
    summary.push({
      form,
      page: p.key,
      url: p.path,
      finalUrl: result.lhr.finalDisplayedUrl,
      performance: Math.round(c.performance.score * 100),
      accessibility: Math.round(c.accessibility.score * 100),
      bestPractices: Math.round(c['best-practices'].score * 100),
      seo: Math.round(c.seo.score * 100),
      fcp: a['first-contentful-paint'].displayValue,
      lcp: a['largest-contentful-paint'].displayValue,
      tbt: a['total-blocking-time'].displayValue,
      cls: a['cumulative-layout-shift'].displayValue,
      failing: Object.values(a)
        .filter((x) => x.score !== null && x.score < 0.9 && x.scoreDisplayMode !== 'informative' && x.scoreDisplayMode !== 'notApplicable' && x.scoreDisplayMode !== 'manual')
        .map((x) => `${x.id} (${x.score})`),
    })
    await page.close()
    console.log(form, p.key, 'done')
  }
}
fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify(summary, null, 2))
await browser.close()
