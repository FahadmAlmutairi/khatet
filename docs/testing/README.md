# Testing evidence

## TR-07 Lighthouse, 16 Oct 2026

Lighthouse 13.5 (headless Chromium 141) on the Sprint 1 pages, mobile and desktop presets. Run on a production build of `main` at `ae31afa` (`vite build` + `vite preview`), signed in as @fahad.

The frontend still uses the sample API (`apps/web/src/api/client.js`), so these runs measure the app with sample data and no network calls to the backend. The sample board has 10 tasks. Repeat the runs on the deployed site once the real API is wired in.

| Page | URL | Mobile perf | Desktop perf | Accessibility | Best practices | SEO |
| --- | --- | --- | --- | --- | --- | --- |
| Sign in | `/sign-in` | 100 | 100 | 100 | 100 | 100 |
| Home (projects) | `/projects` | 97 | 100 | 100 | 100 | 100 |
| Board | `/projects/p-khatet/board` | 100 | 100 | 100 | 100 | 100 |
| Task details | `/projects/p-khatet/board?task=t-6` | 100 | 100 | 100 | 100 | 100 |
| Members | `/projects/p-khatet/members` | 100 | 100 | 100 | 100 | 100 |

Accessibility, best practices and SEO are the same on mobile and desktop.

Mobile timings (Lighthouse's throttled mobile network and CPU):

| Page | First contentful paint | Largest contentful paint | Total blocking time | Layout shift |
| --- | --- | --- | --- | --- |
| Sign in | 1.0 s | 1.0 s | 10 ms | 0 |
| Home | 1.0 s | 1.0 s | 20 ms | 0.114 |
| Board | 0.9 s | 1.3 s | 20 ms | 0 |
| Task details | 0.9 s | 1.2 s | 40 ms | 0 |
| Members | 0.9 s | 1.1 s | 40 ms | 0 |

Every page shows its main content well within the 3 second target in NFR-07. This is not the full NFR-07 check, which needs boards with 30, 100 and 300 tasks.

### Findings

- **Home, mobile: layout shift 0.114** (Lighthouse flags anything over 0.1). The project card list (`main > section > ul.grid`) moves when the projects load. Making the loading placeholder take the same space as the loaded list would remove it.
- **Render-blocking CSS:** the single stylesheet blocks first paint. It costs little at these sizes.
- The remaining flagged items (`llms-txt`, `ard-schema`) are new Lighthouse checks for AI crawlers and structured data. They do not affect the scores and do not apply to a signed-in app.

### Files

- `lighthouse-2026-10-16/mobile-*.html` and `desktop-*.html`: the full reports. Open them in a browser.
- `lighthouse-run.mjs`: the script used for the runs. The sample API keeps the session in `sessionStorage`, so the script signs in on the same tab first and tells Lighthouse not to clear storage. To repeat:

```sh
cd apps/web && npm run build && npx vite preview --port 4173 &
mkdir /tmp/lh && cp docs/testing/lighthouse-run.mjs /tmp/lh && cd /tmp/lh
npm init -y && npm i lighthouse puppeteer-core
node lighthouse-run.mjs http://localhost:4173 ./out
```

Set `CHROME_PATH` to your Chrome or Chromium binary.
