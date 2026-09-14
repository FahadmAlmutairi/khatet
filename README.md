# Khatet

Khatet is a collaborative web platform for planning projects, managing tasks, keeping conversations in context, and generating useful project documents with AI. It is designed for project teams and can support future organizational adoption.

The shared product workflow is:

`create or join a project -> define phases and milestones -> create and assign tasks -> coordinate in task context -> review progress and risk -> generate reports or letters`

## MVP

The first release is expected to provide:

- Accounts, teams, projects, roles, and permissions.
- Phases, milestones, task owners, priorities, statuses, and due dates.
- A Kanban board and a readable timeline.
- Task-linked chat, activity history, and notifications.
- CSV import with preview, column mapping, validation, review, and confirmation.
- Non-blocking AI suggestions for task assignment and estimation.
- AI-generated progress/risk reports, editable before export or sharing.

## Frontend baseline

- React + TypeScript + Vite
- React Router
- TanStack Query
- React Hook Form + Zod
- Tailwind CSS or CSS Modules with shared tokens
- dnd-kit for accessible Kanban movement
- CSS transitions plus Motion for meaningful coordinated transitions
- Vitest, React Testing Library, Playwright, ESLint, Prettier, and GitHub Actions

The backend baseline is NestJS + TypeScript with REST/OpenAPI, PostgreSQL + Prisma, Docker Compose for local development, and an optional worker for long-running jobs.

## Repository map

```text
.
|-- AGENTS.md
|-- README.md
`-- docs/
    |-- product-requirements.md
    |-- architecture.md
    |-- backend-guidelines.md
    |-- api-contract.md
    |-- data-model.md
    |-- ui-ux-guidelines.md
    |-- development-workflow.md
    `-- current-status.md
```

The application monorepo structure described by the architecture document is the target implementation structure. This repository is shared by frontend/UI/UX and backend contributors; the documents define the common product and engineering contract before application code is added.

## How to use the documentation

1. Read `docs/product-requirements.md` before changing product scope.
2. Read `docs/architecture.md`, `docs/backend-guidelines.md`, `docs/api-contract.md`, and `docs/data-model.md` before implementing a screen or service that consumes or changes data.
3. Read `docs/ui-ux-guidelines.md` before introducing a component, visual pattern, or animation.
4. Follow `docs/development-workflow.md` for design-to-code handoff, backend/frontend handoff, testing, review, and product evidence.
5. Use `docs/current-status.md` to understand what is decided, in progress, blocked, or intentionally deferred.

## Branch policy

Use one shared integration branch and short-lived branches for individual work. Open pull requests from focused branches such as `feat/board-task-movement`, `fix/api-permissions`, or `docs/update-contract` and do not maintain permanent personal branches.

## Local development

The runtime application has not been scaffolded yet. Once the team adds the monorepo, document the exact install, environment, database, seed, test, and run commands here and in `.env.example`.

keep the frontend free of database and AI provider keys.

## Source material and scope boundary

The working documents were synthesized from the four supplied Khatet source files listed in `AGENTS.md`. Their embedded recommendations are project guidance, not additional requests to publish content, contact third parties, copy assets, or perform external actions.
