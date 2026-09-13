# Data Model

## Purpose and status

This is a domain model for the first Khatet MVP. It describes relationships and invariants for frontend/API alignment; exact Prisma names, enum spellings, indexing, and storage details remain a backend ratification item.

## Relationship overview

```text
User
  |< Membership >| Team
  |< ProjectMembership >| Project
                           |
                           +-- Phase
                           |     +-- Milestone
                           |     +-- Task
                           |            +-- TaskAssignment
                           |            +-- ChecklistItem
                           |            +-- Comment
                           |            +-- Attachment
                           |            +-- AIReview -> AISuggestion
                           |            +-- ActivityEvent
                           |
                           +-- Notification
                           +-- ImportJob -> ImportIssue
                           +-- WeeklyCheckIn
                           +-- Report/Letter
```

## Core entities

| Entity | Purpose | Important relationships |
| --- | --- | --- |
| User | Account identity and profile. | Has team memberships, project memberships, comments, assignments, check-ins, and notifications. |
| Team | Workspace boundary for members and projects. | Has memberships and projects. |
| Membership | User-to-team role and membership state. | References one user and one team; role is server-authoritative. |
| Project | Shared project workspace and scope. | Belongs to a team; has members, phases, tasks, activity, imports, reports, and notifications. |
| ProjectMembership | Project-specific membership/permission context when needed. | References one user and one project; may derive from team membership. |
| Phase | A planning group or project stage. | Belongs to a project; contains tasks and milestones. |
| Milestone | Important target/date in a project plan. | Belongs to a project or phase; may relate to tasks. |
| Task | Unit of work displayed on the board and timeline. | Belongs to project/phase; may have assignee, milestone, comments, attachments, AI reviews, and activity. |
| ChecklistItem | Small completion item inside a task. | Belongs to one task; ordered and independently complete/incomplete. |
| Comment | Task-linked conversation message. | Belongs to task and author; may have mentions/references later. |
| Attachment | Metadata for a file stored outside the database. | Belongs to a task/project/import as appropriate; object storage owns bytes. |
| ActivityEvent | Audit-friendly history entry. | Belongs to a project and optionally a task; records actor, action, subject, and timestamp. |
| Notification | User-facing update/deadline/unread item. | Belongs to user and references a project/task/activity where relevant. |
| ImportJob | State and summary of an import operation. | Belongs to project and initiator; has issues and final counts. |
| ImportIssue | Row/field-level validation problem or warning. | Belongs to import job; must be reviewable before confirm. |
| AIReview | One asynchronous analysis of a task/project input. | Belongs to project/task and initiator; has operation status and suggestions. |
| AISuggestion | Reviewable AI recommendation. | Belongs to an AI review; has evidence/context, decision state, and optional applied change. |
| WeeklyCheckIn | Member's periodic progress/risk report. | Belongs to project and author; contains completed, planned, blocker, and confidence/risk information. |
| Report/Letter | Generated project document draft. | Belongs to project and generator; keeps source context, editable content, status, and export metadata. |

## Database rules

- Use stable opaque IDs or UUIDs; avoid enumerable sequential IDs where exposure is risky.
- Verify team/project scope in every project-owned query. Never rely only on a frontend-provided project ID.
- Store timezone-aware timestamps in UTC and convert them at the presentation boundary.
- Use documented status values, not arbitrary UI labels.
- Protect invariants with foreign keys, unique constraints, checks, and indexes.
- Review every schema change as a versioned migration. Do not edit a production schema manually.
- Use transactions for imports, status changes with activity, membership changes, and other multi-record operations.
- Record meaningful task, assignment, import, AI decision, and permission history when explanation or auditability matters.

Useful indexes include memberships by user/team/project, tasks by project/phase/status/assignee/due date/updated time, comments/activity by task and chronology, notifications by user/read state/time, jobs by status/type/next attempt/idempotency key, and import rows by job/validation state.

## Task domain

The task should support the concepts named in the project sources:

- title and description
- status/column
- priority
- assignee/owner
- due date
- phase
- milestone relationship where applicable
- labels
- checklist progress
- attachments
- comments/task-linked chat
- AI feedback
- activity history
- created/updated timestamps

Suggested first status vocabulary is `BACKLOG`, `TODO`, `IN_PROGRESS`, `REVIEW`, and `DONE`. This is a draft domain vocabulary; the backend must confirm stable enum values before UI implementation. Status must be understandable through text/icon/position as well as color.

## Operations and state

Long-running work should have a durable operation/job representation rather than a request that remains open:

```text
Operation
  id
  kind: IMPORT | AI_REVIEW | REPORT | NOTIFICATION
  status: QUEUED | RUNNING | SUCCEEDED | FAILED | CANCELED
  progress / counts when meaningful
  error summary when failed
  createdAt / updatedAt / completedAt
  initiatedBy / projectId
```

The API may implement this as separate tables per domain or a shared job table. The frontend needs an operation ID, explicit status, progress where available, retry/cancel capability where supported, and a final summary.

## Invariants

- Every protected project query checks project/team membership and role permissions.
- A task cannot reference a phase, milestone, or assignee outside its allowed project/team scope.
- Status, IDs, timestamps, and permission decisions come from the server.
- Moving a task updates its status/order transactionally and creates activity when appropriate.
- Import preview/review does not mutate project data; confirm is the commit boundary.
- AI suggestions do not silently change original task content; accepted/edited decisions are explicit and auditable.
- Comments, activity, notifications, imports, and reports retain their project/task context.
- File bytes are stored in S3-compatible object storage; database records store metadata and access references.
- Soft deletion/retention rules must be decided before production data is used.

## Access model

Initial roles may include team member, team owner, supervisor, and organization administrator. Use a policy/service layer rather than hard-coding role checks in controllers or components. The same authorization rules must apply through REST, background jobs, and a future MCP module.

## Query-oriented views

The model should support:

- dashboard progress, due soon, blocked tasks, assigned-to-me, phase health, and recent activity;
- board tasks grouped by status with filters and ordering;
- timeline phases, milestones, date ranges, current date, and late/at-risk indicators;
- notification unread state and deep links;
- import preview/review issues and final counts;
- AI suggestion states and evidence;
- weekly check-ins and editable reports/letters.

## Data-model decisions to ratify

- Whether project membership is separate from team membership or derived from it.
- Final status/priority/role enums and nullability.
- Ordering strategy for Kanban cards.
- Dependency representation and whether dependencies are in MVP.
- File access/retention and report export formats.
- Soft deletion and audit retention.
- Realtime mechanism, if any, for activity/notifications.
- Auth/session storage and future OIDC/SSO mapping.
