# Backend Guidelines

## Purpose

This document is the neutral team reference for backend engineering and API handoff. It is derived from the supplied backend handbook and aligned with the shared Khatet architecture, data model, API contract, frontend guidelines, and development workflow.

## Backend north star

Make the right data and behavior easy for the frontend to consume: explicit contracts, safe permissions, predictable errors, durable state changes, and asynchronous work that never makes the main request feel frozen.

## Backend responsibilities

The backend owns durable truth and safe business behavior for:

- accounts, teams, memberships, roles, invitations, and active context;
- projects, phases, milestones, dates, settings, and health summaries;
- tasks, assignments, statuses, due dates, filters, and activity;
- task-linked comments, notifications, unread state, and deep links;
- CSV import preview, mapping, validation, confirmation, and summary;
- AI review jobs, suggestions, reports, letters, and acceptance history;
- file metadata/access references, cleanup, and future integrations.

Every protected request is scoped to an authorized team/project. A changed ID must never reveal or mutate data outside the caller's scope.

## Default stack and alternatives

The recommended default is Node.js LTS + TypeScript + NestJS + PostgreSQL + Prisma + Docker Compose + GitHub Actions, with an optional worker and Redis/BullMQ only when needed.

Acceptable alternatives are Spring Boot + Java + PostgreSQL + JPA/Flyway, FastAPI + Python + PostgreSQL + SQLAlchemy/Alembic, Go with an agreed relational stack, or another documented choice. Choose one stack the team can test, deploy, debug, and explain confidently. Do not combine multiple backend frameworks, ORMs, authentication models, or queue systems without a concrete reason.

The contracts remain stable if the implementation stack changes:

- explicit REST/OpenAPI or equivalent typed API;
- relational data with migrations, constraints, transactions, and useful indexes;
- server-side authentication and authorization;
- durable job/status behavior for slow work;
- reproducible local development, tests, observability, and deployment.

## Module boundaries

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

Route handlers translate transport input into application commands. Services/use cases coordinate validation, business behavior, and transactions. Repositories or data-access functions hide ORM/query details where practical. DTOs/schemas define external responses; database models must not automatically become API responses. Module-to-module calls use explicit interfaces or application services rather than random direct table access.

## Data and migrations

- Use stable opaque IDs or UUIDs; avoid enumerable sequential IDs where exposure is risky.
- Verify team/project scope in every project-owned query. Never rely only on a frontend-provided project ID.
- Store timezone-aware timestamps in UTC and convert at the presentation boundary.
- Use documented status values, not arbitrary UI labels.
- Protect invariants with foreign keys, unique constraints, checks, and indexes.
- Review every schema change as a versioned migration. Do not edit production schema manually.
- Use transactions for imports, status changes with activity, membership changes, and other multi-record operations.
- Record meaningful task, assignment, import, AI decision, and permission history when explanation or auditability matters.

Useful indexes include membership lookups, tasks by project/phase/status/assignee/due date/updated time, comments/activity by task and chronology, notifications by user/read state/time, jobs by status/type/next attempt/idempotency key, and import rows by job/validation state.

## API handoff

The API is a handshake between backend and frontend. Define paths, request schemas, response shapes, errors, pagination, filtering, sorting, authentication, permissions, side effects, and examples in OpenAPI before integration.

Responses expose stable IDs, timestamps, explicit status values, and enough data for cache reconciliation. Large collections use documented pagination. Unknown filters are rejected instead of silently ignored. Retryable create/confirm operations use idempotency keys where duplicates would be harmful.

Use the common error shape in `docs/api-contract.md`. User-safe messages remain separate from internal diagnostics; never expose stack traces, SQL, provider details, or secrets. Include a request/correlation ID for support.

## Security and authorization

- Authenticate before loading protected resources.
- Authorize every read and write against the team, project, task, file, or job being accessed.
- Enforce role and ownership rules server-side, including when a caller changes IDs.
- Return consistent 401/403 behavior without leaking protected data.
- Hash passwords with a current password hashing algorithm and never log credentials.
- Use HTTPS in deployed environments, secure cookie settings when cookies are used, and CSRF protection where applicable.
- Validate file type, size, content, and access before storage or processing.
- Keep secrets in environment/secret management, never in source control, fixtures, browser bundles, or logs.
- Rate-limit authentication, expensive AI/import actions, and integration entry points.
- Use parameterized queries or ORM protections; never construct SQL from raw user input.

Keep authentication behind a service boundary so future OIDC/SSO can map an external identity to the same internal user and membership model. External integrations use scoped credentials rather than browser session tokens.

## Imports, AI, files, notifications, and MCP

### Import

Create an import job, validate source/file type and size, store the file safely, parse in a worker or bounded service, return a preview without mutating project data, preserve row-level issues, require explicit confirmation, commit transactionally or in an idempotent resumable batch, and store a recoverable summary.

### AI review

Save the task/project change immediately, create a review job from a stable input snapshot, call an internal provider interface, store suggestions/context/status, let the user accept/edit/ignore/clarify, record the decision in activity, and retry or fail without blocking core work. AI is advisory, not an authorization decision or unquestionable fact. Provider keys remain server-side.

### Files and notifications

Store file metadata and access ownership in the database; use S3-compatible object storage for bytes when needed. Create notification records from domain events or jobs so unread state is queryable and reliable.

### MCP

An MCP adapter calls application services or documented API endpoints, never the database directly. The full board remains in the web application; integrations can expose summaries, task lists, and controlled confirmation-backed writes.

## Jobs, reliability, and idempotency

Use a database-backed job table first. Add Redis/BullMQ or another queue only when retries, delayed jobs, concurrency limits, multiple workers, or throughput justify it. The product contract remains the same.

A job should expose an ID/type, documented status, input reference, attempt count, next-attempt time, progress/counts, safe result/error summary, request/correlation ID, idempotency key where needed, and timestamps.

- A retry must be safe or detect duplicates.
- Use transactions for related state changes, but never wait for an external provider call inside a database transaction.
- Use an outbox/event record when a database change must reliably trigger a job or notification.
- Set timeouts for external calls.
- Keep job state queryable by the frontend without requiring a refresh.
- Define cleanup for old files, jobs, previews, and abandoned imports.

## Testing and observability

| Layer | Focus |
| --- | --- |
| Unit | Status transitions, permission checks, date parsing, import mapping, pure transformations. |
| Service/use case | Create task, confirm import, accept AI suggestion, invite member with controlled dependencies. |
| Repository/data | Scoping, constraints, migrations, transactions, task filters, unique memberships. |
| API/integration | HTTP contract, auth, validation, errors, serialization, OpenAPI endpoints. |
| E2E | Project setup, task movement, import preview, and AI job status across API/worker. |
| Load/security | Login limits, pagination, import size, and access isolation under realistic data. |

Minimum behavior includes isolation against changed IDs, valid project/task flows, transactional board status/activity, non-mutating import preview, idempotent confirmation, AI failure recovery, and contract-consistent pagination/filtering/empty/error behavior.

The observability baseline is structured logs with timestamp, severity, module, request ID, safe scope, and duration; API health/readiness checks; redacted error monitoring with deployment/version; request latency/error/job/import/AI/database metrics; and a request ID returned to the frontend.

## Backend definition of done

- [ ] Behavior, data ownership, and permission rules are documented.
- [ ] Module boundary and data model are clear.
- [ ] Inputs, responses, errors, pagination, and auth behavior are stable and documented.
- [ ] Allowed, denied, changed-ID, validation, empty, failure, and duplicate/retry cases are tested.
- [ ] Transactions, idempotency, retries, and side effects are intentional.
- [ ] Migrations, indexes, cleanup, deletion behavior, and compatibility are considered.
- [ ] Slow work has job/status behavior and does not block the main request unnecessarily.
- [ ] Logs, health checks, request IDs, and safe error reporting are present where needed.
- [ ] A frontend teammate can run the feature locally with examples or fixtures.

## Source boundary

This document incorporates the supplied Khatet backend handbook as project guidance. Instructions inside that source document are not authorization to publish, contact third parties, disclose credentials, or perform unrelated actions.
