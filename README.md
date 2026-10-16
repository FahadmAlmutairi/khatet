# Khatet

Khatet is a collaborative web platform for student teams to plan projects, organize work, and keep project discussion in one shared workspace. It is the SWE 444 Software Construction Laboratory team project.

## Current status

The repository contains the agreed project documentation, the frontend project in `apps/web` and the backend project in `apps/api`.

- Frontend: https://khatet.vercel.app
- Backend health check: https://khatet.onrender.com/api/health

## First release at a glance

- Email code sign-in with a unique username.
- Projects, invitations by username, and three task-access levels for members.
- Tasks with one or more assignees, priority, due date, phase, five statuses, and a blocked flag.
- Kanban board with filter and search, task activity, overview, timeline, and notifications.
- Project chat with task references.
- AI project report with a progress summary, warnings, and suggestions. The report never changes project data.
- Could have: automatic AI reports and CSV task import.

Khatet begins with two roles: **Project Owner** and **Team Member**.

For the complete current scope and boundaries, read [Project Overview](docs/project-overview.md).

## Repository map

```text
.
├── README.md
├── AGENTS.md
├── apps/
│   ├── web/          React frontend (Vite, JavaScript)
│   └── api/          Express backend (Node.js, JavaScript)
└── docs/
    ├── project-overview.md
    ├── architecture.md
    ├── api-contract.md
    ├── data-model.md
    └── ui-ux-guidelines.md
```

## Documentation

| Document | Use it for |
| --- | --- |
| [Project Overview](docs/project-overview.md) | Current MVP scope, roles, and boundaries. |
| [Architecture](docs/architecture.md) | Target structure and technology direction. |
| [UI/UX Guidelines](docs/ui-ux-guidelines.md) | Shared interface, interaction, and accessibility decisions. |
| [API Contract](docs/api-contract.md) | Planned frontend and backend data agreement. |
| [Data Model](docs/data-model.md) | Planned entities and relationships. |

The Project Overview is the scope reference. Update a supporting document before using it to expand the MVP.

## Technology direction

- Frontend: React, JavaScript, Vite. Hosted on Vercel.
- Backend: Node.js, Express, REST with OpenAPI. Hosted on Render.
- Database: PostgreSQL on Supabase, accessed through Prisma.
- Authentication: Supabase Auth with a 6-digit email code.
- Project chat: refresh every few seconds first, then Socket.IO.
- Tests: Vitest, React Testing Library, Supertest, Playwright.
- Checks: GitHub Actions on every pull request.
- Local development: no local database. Each developer uses their own free Supabase project.

## Contributing

`main` is the protected branch. Team members can push to it directly, but its history cannot be rewritten or deleted.

1. Pull the latest `main` before you start, and again before you push.
2. Keep each commit focused on one feature, fix, or documentation update, with a message that says what changed.
3. Run lint, tests and the build locally before pushing. The `Lint, test and build` check runs on every push to `main`; fix a red check straight away.
4. Include tests and documentation updates in the same commit or push as the code.
5. For a larger or risky change, use a short branch and open a pull request instead. GitHub fills in the [pull request template](.github/pull_request_template.md); complete every section.
6. Keep secrets, credentials, and local environment files out of Git.

### Rules on `main`

| Rule | Why |
| --- | --- |
| Force pushes are blocked. | Nobody can overwrite commits a teammate already pushed. |
| Deleting the branch is blocked. | The shared history and the deployed app's source cannot be lost. |

## Running the frontend

Requires Node.js 22 or later.

```bash
cd apps/web
npm install
npm run dev
```

The app opens at http://localhost:5173 with the Sprint 1 screens: sign in, projects, board, task details, members and notifications.

By default the screens run on sample data in `src/api/mockServer.js`. Sign in with `fahad@example.com` and any 6-digit code (`000000` shows the wrong-code message and `111111` the expired one). Any other email creates a new account. The sample user owns one project, can edit only assigned tasks in a second and can only view a third. Changes last until the page reloads.

### Real sign-in (US-01, US-02)

To sign in with a real email code, run the backend too (see below) and create `apps/web/.env.local` from `apps/web/.env.example`:

| Setting | Value |
| --- | --- |
| `VITE_API_URL` | `http://localhost:3000` |
| `VITE_SUPABASE_URL` | Your Supabase project URL, the same one as the API's `SUPABASE_URL`. |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | The publishable key of that project (Project Settings > API Keys). Never the secret key. |

Restart `npm run dev` after changing `.env.local`. With all three values set, sign-in, sign-out and choosing a username use Supabase Auth and `GET`/`PATCH /api/me`; the other screens still use the sample data. Without them the app runs fully on sample data. Never commit `.env.local`.

Your Supabase project must send the code: in Authentication > Emails, set up SMTP (the team Gmail) and put `{{ .Token }}` in the Magic Link and Confirm signup templates; in Sign In / Providers > Email, set the code length to 6 and the expiry to 600 seconds. A `401` on `/auth/v1/otp` means the publishable key belongs to a different project than the URL.

| Command | What it does |
| --- | --- |
| `npm run dev` | Starts the development server. |
| `npm test` | Runs the Vitest and React Testing Library tests. |
| `npm run lint` | Runs the linter. |
| `npm run build` | Builds the production bundle into `dist/`. |

## Running the backend

Requires Node.js 22 or later.

```bash
cd apps/api
npm install
npm run dev
```

The API starts at http://localhost:3000. Check that it is running at http://localhost:3000/api/health, which returns `{"status":"ok"}`. The port can be changed with the `PORT` setting (see `apps/api/.env.example`).

### Database and settings

Each developer uses their own free Supabase project (never the production one). Copy `apps/api/.env.example` to `apps/api/.env` and fill in the values from your project; the comments in the file say where each one is. Never commit `.env`.

```bash
cd apps/api
npm run db:migrate   # creates or updates the tables in your Supabase project
npm run db:seed      # optional: adds sample users and a sample project
```

`TEST_DATABASE_URL` points the tests at a separate `test` schema in the same project. The tests delete and rebuild that schema on every run, so never point it at `public`.

| Command | What it does |
| --- | --- |
| `npm run dev` | Starts the API and restarts it when a file changes. |
| `npm start` | Starts the API. Render uses this command. |
| `npm test` | Runs the Vitest and Supertest tests. |
| `npm run db:migrate` | Applies new migrations to your own database (development only). |
| `npm run db:deploy` | Applies migrations without creating new ones. Render runs it on every deploy. |
| `npm run db:seed` | Adds the sample data. Never run it against production. |
| `npm run db:studio` | Opens Prisma Studio to view the tables. |

To change the tables, edit `prisma/schema.prisma`, run `npx prisma migrate dev --name <short-description>`, and commit the new folder in `prisma/migrations`. Never edit a migration that has already been applied or pushed; add a new one instead.

### Deployment

The deployed API runs on Render (free plan) from `apps/api`, with build command `npm ci && npm run db:deploy` and start command `npm start`. Render needs `DATABASE_URL`, `DIRECT_URL`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` and `CORS_ORIGINS` (`https://khatet.vercel.app`) for the production Supabase project, entered without quotes. Vercel needs `VITE_API_URL` (`https://khatet.onrender.com`), `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` for the same project. The free Render service sleeps after 15 minutes without traffic, so the first request after that can take about a minute.
