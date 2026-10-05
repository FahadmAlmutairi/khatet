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

1. Create a short branch from the default branch.
2. Keep the branch focused on one feature, fix, or documentation update.
3. Open a pull request; merge into the protected main branch after a review and passing checks.
4. Include tests and documentation updates in the same pull request as the code.
5. Keep secrets, credentials, and local environment files out of Git.

## Running the frontend

Requires Node.js 22 or later.

```bash
cd apps/web
npm install
npm run dev
```

The app opens at http://localhost:5173 with placeholder pages for Sign in (`/sign-in`), My projects (`/projects`) and the Board (`/projects/:projectId/board`).

| Command | What it does |
| --- | --- |
| `npm run dev` | Starts the development server. |
| `npm test` | Runs the Vitest and React Testing Library tests. |
| `npm run lint` | Runs the linter. |
| `npm run build` | Builds the production bundle into `dist/`. |

Backend setup commands will be added with the API project.
