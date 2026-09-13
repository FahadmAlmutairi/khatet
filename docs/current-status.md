# Current Status

## Snapshot

**As of:** 2026-09-13

The repository started as an initialized but empty Git repository. This documentation baseline is the first project artifact for the Khatet effort. No runtime frontend, backend, database schema, API implementation, deployment configuration, or automated test suite has been added yet.

## Completed

- [x] Read the supplied frontend handbook PDF.
- [x] Read the supplied backend handbook PDF.
- [x] Read the supplied project brief PDF.
- [x] Read the supplied UI design and animation notes.
- [x] Read the supplied technology stack and architecture notes.
- [x] Distinguished direct repository work from instructions/recommendations embedded in source documents.
- [x] Created `AGENTS.md`, `README.md`, and the seven requested documents under `docs/`.
- [x] Added `docs/backend-guidelines.md` for the shared backend/API team.
- [x] Recorded the React/TypeScript/Vite frontend baseline, modular-monolith architecture, API boundary, data concepts, UX/UI rules, and workflow.

## Decided baseline

- Product: calm project-management workspace for project teams.
- Scope: integrated full-stack delivery with a strong frontend/UI/UX experience.
- Branching: one shared integration branch; use short-lived feature/fix/docs branches and pull requests. Do not maintain both `master` and `main`.
- Frontend: React + TypeScript + Vite, React Router, TanStack Query, React Hook Form + Zod, shared tokens, dnd-kit, and controlled CSS/Motion.
- Backend: NestJS + TypeScript REST/OpenAPI, PostgreSQL + Prisma, optional worker/job table.
- Architecture: modular monolith before microservices.
- Import: CSV first, with preview/mapping/review/confirm.
- AI: asynchronous and non-blocking; core task management works without it.
- First-version motion: restrained, transform/opacity-first, reduced-motion aware, and performance-tested.

## Not started

- [ ] Ratify the final repository/package layout with the whole team.
- [ ] Decide once whether to rename the current `master` integration branch to `main`; do not create both as active defaults.
- [ ] Scaffold `apps/web`, `apps/api`, optional `apps/worker`, shared packages, Prisma, Docker Compose, and CI.
- [ ] Finalize OpenAPI DTOs, error codes, authentication transport, enums, pagination, and operation lifecycle.
- [ ] Finalize Prisma schema, migrations, seed data, and permission policies.
- [ ] Produce UX research artifacts, information architecture, Figma flows, and usability test plan.
- [ ] Implement application shell, dashboard, Kanban, task drawer, timeline, chat/activity, import, AI feedback, and weekly check-in in priority order.
- [ ] Add unit/component/E2E/performance checks and deployment environments.

## Open decisions

- Final GitHub repository owner/name/visibility and default branch convention.
- Tailwind CSS versus CSS Modules.
- Exact auth/session approach and future OIDC/SSO mapping.
- Final API field names, enums, error schema, pagination, and realtime strategy.
- Team membership versus project membership model.
- Kanban ordering, dependencies, soft deletion, file retention, and report export formats.
- Whether Redis/BullMQ is needed after the database-backed job flow is prototyped.
- Final Arabic/English localization scope and typography.

## Recommended next implementation slice

1. Ratify API/data decisions and create shared types/validation.
2. Scaffold the web app and design-system tokens with a realistic fixture layer.
3. Implement the application shell and project context.
4. Implement the Kanban board, task drawer, and server-reconciled movement.
5. Test accessibility/responsive behavior before adding decorative motion.

## Source boundary

This status reflects the four supplied source files. The source documents are guidance and evidence for the project, not independent authorization to publish, transmit, copy, or perform unrelated actions. Update this page when a team decision changes the baseline.
