# Data Model

## Purpose and status

This is the domain model for the first Khatet MVP. It describes entities, relationships, and invariants for frontend/API alignment. Exact Prisma names, indexing, and storage details are confirmed by the backend team in `schema.prisma` and migrations.

## Relationship overview

```text
User
  |< ProjectMember >| Project
  |< Invitation    >| Project
                       |
                       +-- Phase
                       +-- Task
                       |     +-- TaskAssignee >-- User
                       +-- ChatMessage (may reference a Task)
                       +-- ActivityEvent
                       +-- AIReport
                       +-- ImportJob -> ImportIssue   (Could have)
User
  +-- Notification
```

## Core entities

| Entity | Purpose | Important fields and relationships |
| --- | --- | --- |
| User | Khatet account linked to a Supabase Auth user. | Supabase user ID, email, unique `username` (no display name). Username can change once every 30 days. |
| Project | Shared project workspace. | Name (not empty), description, created by the owner; has members, phases, tasks, chat, activity, and reports. Deleting a project deletes its tasks and messages. |
| ProjectMember | A user's membership in one project. | `role` (`OWNER` or `MEMBER`), `taskAccess` (`VIEW_ONLY`, `EDIT_ASSIGNED`, `EDIT_ALL`; default `EDIT_ASSIGNED`). Owners have full access regardless of `taskAccess`. A removed or departed member loses access, but their past messages and task history stay. |
| Invitation | Owner's invitation to a registered user. | Project, invited user, invited by, `status` (`PENDING`, `ACCEPTED`, `DECLINED`). Shown in the invitee's notifications. Accepting creates a ProjectMember with `EDIT_ASSIGNED`; declining removes the invitation. |
| Phase | A project stage shown on the timeline. "Phase" is the agreed word; there is no separate milestone entity. | Belongs to a project; has a name, a start date, and an end date. Created and edited by the owner. |
| Task | Unit of work shown on the board and timeline. | Title, description, `status`, `priority`, `isBlocked`, `blockedReason`, due date, optional link to one phase, board position, creator, timestamps. |
| TaskAssignee | Links a task to each assigned member. | A task has at least one assignee; every assignee is a project member. |
| ChatMessage | Project chat message. | Project, author, text (not empty), optional referenced task (shown as a link), sent time. |
| ActivityEvent | Task history entry. | Project, task, actor, what changed (status, assignees, priority, due date, Blocked flag), timestamp. |
| Notification | In-app update for one user. | User, type (invitation, task assignment, and later report ready), related project/task/invitation, read state. |
| AIReport | One generated project report. | Project, requested by (or automatic), `status` (`RUNNING`, `READY`, `FAILED`), summary, warnings, suggestions, generated time. Readable by every participant. |
| ImportJob / ImportIssue | CSV import state and row-level problems (Could have). | Project, initiator, status, created and skipped counts; issues are reviewable before confirm. |

## Enumerations

| Field | Values |
| --- | --- |
| Task `status` | `BACKLOG`, `TODO`, `IN_PROGRESS`, `READY_FOR_REVIEW`, `DONE` (default `TODO`) |
| Task `priority` | `LOW`, `MEDIUM`, `HIGH` |
| ProjectMember `role` | `OWNER`, `MEMBER` |
| ProjectMember `taskAccess` | `VIEW_ONLY`, `EDIT_ASSIGNED`, `EDIT_ALL` |
| Project `reportSchedule` (Could have) | `WEEKLY`, `MONTHLY`, `DISABLED` |

Blocked is not a status. `isBlocked` may be true only while the task is `IN_PROGRESS`, with an optional `blockedReason`. Moving a task to Backlog keeps all its details and assignees, and Backlog tasks are kept apart from active work on the board. Status must be understandable through text and icon as well as color.

## Database rules

- Use UUIDs; avoid enumerable sequential IDs.
- Verify project membership in every project-owned query. Never rely only on a frontend-provided project ID.
- Store timestamps in UTC and convert them at the presentation boundary.
- Use the documented enum values, not UI labels.
- Protect invariants with foreign keys, unique constraints, checks, and indexes.
- Review every schema change as a Prisma migration. Do not edit a deployed schema manually.
- Use transactions for imports, status changes with activity, membership changes, and invitation acceptance.
- Tables first created in Sprint 1 (TF-04): users, projects, and project members.

Useful indexes include members by user and project, tasks by project/status/position/due date and title (search), task assignees by user, chat messages by project and time, activity by task and time, and notifications by user/read state/time.

## Invariants

- Every protected project query checks project membership and the member's role and task access.
- A task has a title and at least one assignee, and every assignee is a member of the task's project.
- A task's phase belongs to the same project.
- Only the owner manages membership, invitations, task access, phases, and project settings. The owner cannot leave their own project.
- Only the owner and members with `EDIT_ALL` create or delete tasks.
- Status, IDs, timestamps, and permission decisions come from the server.
- Moving a task updates its status and position in one transaction and records activity.
- Import preview and review do not change project data; confirm is the commit boundary.
- AI reports only read project data. Creating a report never changes tasks, assignments, dates, or permissions.

## Query-oriented views

The model should support:

- overview progress (completed tasks out of total), tasks assigned to me, and a Needs attention list of overdue and blocked tasks;
- board tasks grouped by status, filtered by assignee/status/priority, and searched by title;
- timeline of phases and dated tasks in date order (tasks without a due date are not shown);
- task activity, newest first;
- chat history in time order with task references;
- notification unread count, invitation responses, and deep links;
- AI report list (manual and automatic) and the latest report;
- import preview issues and final counts (Could have).

## Decisions still open

- Ordering strategy for board cards.
- Date, timezone, and overdue rules.
- CSV limits, duplicates, and retries.
- Soft deletion and history retention.
