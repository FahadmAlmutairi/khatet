# Architecture

## Status and decisions

The baseline architecture is a modular monolith: a separate React frontend, a NestJS API, PostgreSQL, and an optional worker for long-running work. This keeps the semester project understandable and deployable without prematurely splitting into microservices.

## Target repository structure

```text
khatet/
  apps/
    web/                 # React + Vite + TypeScript
    api/                 # NestJS REST API and initial MCP module
    worker/              # Optional import, AI, report, notification jobs
  packages/
    ui/                  # Reusable Khatet design-system components
    shared-types/        # Shared API/domain types
    validation/          # Shared Zod or contract schemas
    config/              # TypeScript, lint, build configuration
  prisma/
    schema.prisma
    migrations/
  infra/
    docker-compose.yml
  .github/
    workflows/
```

## System context

```text
Browser
  React + TypeScript + Vite
  Router + Query + forms + UI package
          |
          | REST/OpenAPI over HTTPS
          v
NestJS application
  Auth, teams, projects, phases, tasks, comments, activity,
  imports, AI reviews, reports, notifications, files, MCP module
          |
          +--> PostgreSQL + Prisma
          |
          +--> Optional worker/job table for imports, AI, reports, notifications
          +--> S3-compatible object storage for attachments/import files
```

The browser is not a security boundary. The API owns authorization, validation, transaction boundaries, business rules, and authoritative resource state.

## Technology choices

| Layer | Choice | Frontend implication |
| --- | --- | --- |
| Web app | React + TypeScript + Vite | Feature-oriented modules and strict typing. |
| Routing | React Router | Deep-linkable screens and URL-owned filters/selection. |
| Server state | TanStack Query | Query/mutation hooks own remote data, cache, invalidation, and retry. |
| Forms | React Hook Form + Zod | Validate at form boundaries and preserve values on recoverable errors. |
| Styling | Tailwind CSS or CSS Modules | Use one shared token vocabulary. |
| Interaction | dnd-kit | Real pointer/touch/keyboard drag-and-drop with server reconciliation. |
| Motion | CSS plus Motion | One controlled motion system; no business rules in animation code. |
| API | NestJS REST/OpenAPI | Consume a documented contract; do not invent response shapes. |
| Data | PostgreSQL + Prisma | IDs, timestamps, permissions, and status are server-authoritative. |

## Frontend boundaries

```text
apps/web/src/
  app/          providers, router, shell, error boundaries
  components/   shared primitives and composed UI
  features/     dashboard, board, tasks, timeline, imports, ai, chat
  routes/       route-level screens and loaders
  hooks/        reusable UI and query hooks
  lib/          API client, query keys, permissions, formatters
  styles/       tokens, global styles, accessibility defaults
```

Feature modules should expose a small public API. A typical module may contain `components/`, `queries.ts`, `mutations.ts`, `schemas.ts`, `types.ts`, `utils.ts`, `routes.tsx`, and `index.ts`. Pure transformations and validation belong in testable functions; route components orchestrate rather than own all business logic.

## Backend boundaries

The API is organized by product capability:

```text
apps/api/
  Auth
  Users and Teams
  Projects and Phases
  Tasks
  Comments and Activity
  Notifications
  Imports
  AI Review and Reports
  Files and Integrations
```

Route handlers translate transport input into application commands. Services/use cases coordinate validation, business behavior, and transactions. Repositories or data-access functions hide ORM/query details where practical. DTOs and schemas define external responses; database models must not automatically become API responses. Module-to-module calls use explicit interfaces or application services rather than random direct table access.

The backend should remain easy to test without starting the entire system for every unit of logic. Long-running work uses a database-backed job table first and a queue/worker only when retries, delayed jobs, concurrency, multiple workers, or throughput justify the added infrastructure.

## State ownership

| State | Owner | Examples |
| --- | --- | --- |
| Server state | TanStack Query | Projects, tasks, users, notifications, import status, AI results. |
| URL state | React Router/search params | Project ID, selected task, filters, timeline range, wizard step. |
| Local UI state | Component or feature hook | Drawer open, menu expanded, selected tab, drag preview. |
| Form state | React Hook Form | Task edit, import mapping, AI feedback edit, settings. |
| Derived state | Pure selectors/memos only when useful | Progress percentage, grouped tasks, filtered results. |

Use stable query keys such as `['project', projectId]`, `['tasks', { projectId, filters }]`, and `['notifications', { teamId }]`. Choose stale times, retries, and invalidation deliberately. Optimistic board movement is allowed only with rollback; use server-confirmed data for permissions, imports, AI output, and destructive actions.

## Data flow and asynchronous work

1. A route requests data through a feature query hook.
2. The centralized API client handles auth, request IDs, parsing, and the typed error shape.
3. The API validates input, checks membership/role, applies business rules, and returns the authoritative resource or operation status.
4. The query cache reconciles the response or performs intentional invalidation.
5. Imports, AI reviews, reports, and other long work return an operation/job identifier and expose progress/status for polling or subscription.

AI flow: save task -> create review job -> worker analyzes -> store suggestions -> user accepts/edits/ignores/asks -> record accepted decision in activity. Task creation must not wait for AI.

Import flow: upload CSV -> parse on server -> preview -> map columns -> validate -> review issues -> explicit confirm -> commit -> activity summary. Additional providers should extend the import domain rather than replace this flow.

## Authentication and college readiness

Start with Khatet accounts behind an authentication service boundary. Keep the authorization model ready for team member, team owner, supervisor, and organization administrator roles. Prepare for OIDC/SSO without spreading provider-specific code through feature modules.

The system should be designed for tenant/project isolation, audit logs, secure passwords, rate limiting, HTTPS, backups, health checks, monitoring, privacy/data-retention policies, and future Arabic/English support.

## Deployment environments

- **Development:** Docker Compose, PostgreSQL, optional Redis, `.env.example`, seed data, migrations, and mock AI mode.
- **Staging:** separate database, test data, HTTPS, stable URL, automatic deployment from a staging branch, and end-to-end checks.
- **Production:** static frontend, container/managed NestJS API, separate worker if needed, managed PostgreSQL backups, object storage, HTTPS, health endpoint, structured logs, error monitoring, and migration/rollback plan.

## Architecture guardrails

- Do not begin with microservices or two different backend frameworks for the same service.
- Do not let the frontend decide whether a user is authorized.
- Do not store large files in PostgreSQL when object storage is suitable.
- Do not make AI or ChatGPT/MCP a dependency of the core product.
- The MCP endpoint may begin inside the API and must call application services or API endpoints, never the database directly.
