# Khatet

Khatet is a collaborative web platform for student teams to plan projects, organize work, and keep project discussion in one shared workspace. It is the SWE 444 Software Construction Laboratory team project.

## Current status

The repository contains the agreed project documentation and the frontend project in `apps/web`. The backend will be added in `apps/api`.

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
│   └── web/          React frontend (Vite, JavaScript)
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

`main` is the protected branch. Nobody pushes to it directly; every change reaches it through a reviewed pull request.

1. Update your local `main`, then create a short branch from it, named for the work, for example `tf-05-task-board` or `fix-sign-in-error`.
2. Keep the branch focused on one feature, fix, or documentation update.
3. Push the branch and open a pull request into `main`. GitHub fills in the [pull request template](.github/pull_request_template.md); complete every section.
4. Include tests and documentation updates in the same pull request as the code.
5. Ask a teammate to review. Merge only after the review is approved, the checks pass and every review conversation is resolved, then delete the branch.
6. Keep secrets, credentials, and local environment files out of Git.

### Rules on `main`

| Rule | Why |
| --- | --- |
| A pull request is required before merging. | Every change is visible and discussed before it lands. |
| At least one approving review. A new push dismisses earlier approvals. | A second person reads every change, including the last edit. |
| The `Lint, test and build` check must pass. | Broken code does not reach the shared branch or the deployed app. |
| Review conversations must be resolved. | Review comments are answered before merging. |
| Force pushes and branch deletion are blocked. | The shared history cannot be rewritten or lost. |

## Running the frontend

Requires Node.js 22 or later.

```bash
cd apps/web
npm install
npm run dev
```

The app opens at http://localhost:5173 with the Sprint 1 screens: sign in, projects, board, task details, members and notifications.

Until the API exists, the screens run on sample data in `src/api/mockServer.js`. Sign in with `fahad@example.com` and any 6-digit code (`000000` shows the wrong-code message and `111111` the expired one). Any other email creates a new account. The sample user owns one project, can edit only assigned tasks in a second and can only view a third. Changes last until the page reloads.

| Command | What it does |
| --- | --- |
| `npm run dev` | Starts the development server. |
| `npm test` | Runs the Vitest and React Testing Library tests. |
| `npm run lint` | Runs the linter. |
| `npm run build` | Builds the production bundle into `dist/`. |

Backend setup commands will be added with the API project.
