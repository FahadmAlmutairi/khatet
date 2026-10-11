# Architecture

## Status and decisions

The baseline architecture is a modular monolith: a React frontend, one Express API, and PostgreSQL on Supabase. This keeps the semester project understandable and deployable on free hosting plans without splitting into microservices.

Agreed stack (Sprint 0 report, Sections 4 and 7): React + JavaScript + Vite, Node.js + Express, PostgreSQL on Supabase, Prisma, Supabase Auth email code, Socket.IO for chat, Vercel + Render, GitHub Actions. There is no local database installation. The main tradeoff is that backend modules cannot be scaled independently, and the free plans of Vercel, Render, and Supabase add external-service limits.

## Target repository structure

```text
khatet/
  apps/
    web/                 # React + Vite + JavaScript
    api/                 # Node.js + Express REST API
      prisma/
        schema.prisma
        migrations/
  .github/
    workflows/
```

## System context

```text
Browser (Vercel)
  React + Vite
  Router + Query + forms + UI components
          |
          | REST over HTTPS (Supabase access token in the Authorization header)
          | Socket.IO for project chat (after the polling version)
          v
Express API (Render)
  Auth check, projects, members and invitations, tasks, phases,
  chat (Socket.IO), activity, notifications, AI reports, imports
          |
          +--> PostgreSQL on Supabase (through Prisma)
          +--> Supabase Auth (verifies the user's token)
          +--> AI service: Claude API or OpenAI API (limited project summary, reports only)
```

The browser is not a security boundary. The API owns authorization, validation, transaction boundaries, business rules, and authoritative resource state. The browser uses Supabase only to sign in; it never reads or writes project tables directly.

## Technology choices

| Layer | Choice | Implication |
| --- | --- | --- |
| Web app | React + JavaScript + Vite | Feature-oriented modules; validate data at boundaries with Zod. |
| Routing | React Router | Deep-linkable screens and URL-owned filters/selection. |
| Server state | TanStack Query | Query/mutation hooks own remote data, cache, invalidation, and retry. |
| Forms | React Hook Form + Zod | Validate at form boundaries and preserve values on recoverable errors. |
| Styling | Tailwind CSS or CSS Modules | Use one shared token vocabulary. |
| Interaction | dnd-kit | Pointer, touch, and keyboard drag-and-drop with server reconciliation. |
| Motion | CSS plus Motion | One controlled motion system; no business rules in animation code. |
| API | Express, REST with OpenAPI | Routes follow [API contract](api-contract.md) and are documented in OpenAPI; do not invent response shapes. |
| Data | PostgreSQL on Supabase + Prisma | IDs, timestamps, permissions, and status are server-authoritative. |
| Auth | Supabase Auth email code via Gmail SMTP | The API verifies the token on every request and maps it to a Khatet user. |
| Chat | Refresh every few seconds, then Socket.IO | Socket.IO runs on the Express backend; events pass through the same membership checks as REST. |
| Tests | Vitest, React Testing Library, Supertest, Playwright | Unit and integration tests in every pull request; end-to-end tests on the deployed site. |

## Frontend boundaries

```text
apps/web/src/
  app/          providers, router, shell, error boundaries
  components/   shared primitives and composed UI
  features/     overview, board, tasks, timeline, members, chat, notifications, reports, settings, imports
  routes/       route-level screens
  hooks/        reusable UI and query hooks
  lib/          API client, query keys, permissions, formatters
  styles/       tokens, global styles, accessibility defaults
```

Feature modules should expose a small public API. A typical module may contain `components/`, `queries.js`, `mutations.js`, `schemas.js`, `utils.js`, and `index.js`. Pure transformations and validation belong in testable functions; route components orchestrate rather than own all business logic.

## Backend boundaries

The API is organized by product capability:

```text
apps/api/src/
  auth/            token verification, current user, username
  projects/        projects, project settings, and phases
  members/         invitations, membership, access levels, removing and leaving
  tasks/           tasks, assignees, status, blocked flag, filter and search
  chat/            project chat messages
  activity/        activity events
  notifications/   in-app notifications and invitation responses
  reports/         AI project reports
  imports/         CSV import (Could have)
```

Routers translate HTTP input into calls to services. Services check permissions, apply business rules, and run transactions. Prisma access stays inside each module's data functions. Responses are shaped explicitly; database rows must not automatically become API responses. Permission checks live in one shared policy module used by REST routes and Socket.IO handlers alike.

The backend should remain easy to test without starting the entire system for every unit of logic. Long-running work (AI reports, imports) is tracked in a database row with a status; there is no separate worker or queue in the MVP.

## State ownership

| State | Owner | Examples |
| --- | --- | --- |
| Server state | TanStack Query | Projects, tasks, members, notifications, chat messages, report status. |
| URL state | React Router/search params | Project ID, selected task, filters, wizard step. |
| Local UI state | Component or feature hook | Sidebar open, menu expanded, selected tab, drag preview. |
| Form state | React Hook Form | Task edit, invitation, settings, import mapping. |
| Derived state | Pure selectors/memos only when useful | Progress percentage, grouped tasks, filtered results. |

Sprint 1 status: the Sprint 1 forms (sign-in, create project, create and edit task, invite) use component state with `components/ui/formState.js`, and React Hook Form and Zod are not installed in `apps/web` yet. The team decides whether to add them before the settings and import forms in Sprint 2, and updates this table either way. The API still validates every request with Zod.

Use stable query keys such as `['project', projectId]`, `['tasks', { projectId, filters }]`, and `['notifications']`. Choose stale times, retries, and invalidation deliberately. Optimistic board movement is allowed only with rollback; use server-confirmed data for permissions, imports, AI output, and destructive actions.

## Data flow and asynchronous work

1. A route requests data through a feature query hook.
2. The centralized API client attaches the Supabase access token and handles request IDs, parsing, and the typed error shape.
3. The API verifies the token, checks project membership and access level, applies business rules, and returns the authoritative resource or operation status.
4. The query cache reconciles the response or performs intentional invalidation.
5. AI reports and imports return an identifier and expose a status the frontend polls.

AI report flow: owner requests a report -> API creates a report row (`RUNNING`) -> API builds a limited project summary and calls the AI service with a 30-second timeout -> API stores the summary, warnings, and suggestions (`READY`) or a failure (`FAILED`, shown with a retry button) -> every participant can read the report with its generation date. The report never writes to tasks, assignments, dates, or permissions. Automatic Weekly/Monthly reports (Could have, Sprint 4) reuse the same flow and notify the owner.

Chat flow (first version): the client refreshes messages every few seconds (at most 5, to meet NFR-09); the API checks membership on each request and stores messages in PostgreSQL. Socket.IO later replaces refreshing for delivery, with the same storage and checks.

Import flow (Could have, Sprint 4): upload CSV -> parse on server -> map columns -> validate -> preview issues -> explicit confirm -> commit in one transaction -> activity summary.

## Future readiness

Keep Supabase-specific code inside the API's auth module and the web app's sign-in screens. Support the current Project Owner and Team Member roles, and add further roles only when product requirements call for them.

Plan for project isolation, task activity history, rate limiting on sign-in and AI requests, HTTPS, and health checks. Security checks use free tools: GitHub secret scanning, Dependabot alerts, npm audit, and an OWASP ZAP baseline scan before Sprint 4.

## Deployment environments

- **Development:** each developer runs the web app and API locally against their own free Supabase project, with an example settings file, Prisma migrations, seed data (an owner and one member per access level), and a mock AI mode.
- **Test:** automated tests run locally and in GitHub Actions against a separate test database rebuilt from the Prisma migrations before each run.
- **UAT and production:** web app on Vercel, API and Socket.IO on Render, PostgreSQL and Auth on Supabase, all over HTTPS. The deployed site is used for acceptance testing at every sprint review. Secrets live only in the hosting settings. UptimeRobot checks the health endpoint every 5 minutes.

Free-plan limits to plan around: Render's free API sleeps after 15 minutes without traffic (the uptime monitor keeps it awake, risk R-01), and free Supabase projects pause after about a week without use.

## Architecture guardrails

- Do not begin with microservices or a second backend framework.
- Do not let the frontend decide whether a user is authorized.
- Do not let the browser query project tables through Supabase directly; all project data goes through Express.
- Do not make AI a dependency of the core product. AI only writes reports and never changes project data.
- Keep provider keys and the Supabase service key on the server only.
