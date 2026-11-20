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
| Project | Shared project workspace. | Name (not empty), description, created by the owner; has members, phases, tasks, chat, activity, and reports. Projects are archived, not deleted: archiving (owner only) sets `archivedAt`, `archivedById` and `archiveSummary` (name, description, created date, members with their roles, and task counts by status, copied at that moment). An archived project's board, chat, members, settings and reports are closed (410 `PROJECT_ARCHIVED`) until the owner restores it; only its project log stays readable, for the members it had when archived. Pending invitations and the project's notifications are removed when it is archived. The project row, and everything in it, is deleted only once every member has deleted the archived project for themselves. The owner can restore it while they still have it: the archive fields are cleared and every member's `archiveRemovedAt` is cleared too, so tasks assigned to them stay valid. Removed invitations and notifications do not come back. |
| ProjectMember | A user's membership in one project. | `role` (`OWNER` or `MEMBER`), `taskAccess` (`VIEW_ONLY`, `EDIT_ASSIGNED`, `EDIT_ALL`; default `EDIT_ASSIGNED`). Owners have full access regardless of `taskAccess`. A removed or departed member loses access, but their past messages and task history stay. They are taken off their task assignments; removing or leaving is refused while they are the only assignee of a task, so the owner reassigns those tasks first. `archiveRemovedAt` is set when the member deletes an archived project for themselves; they then lose access to its log, and the others keep theirs. |
| Invitation | Owner's invitation to a registered user. | Project, invited user, invited by, `status` (`PENDING`, `ACCEPTED`, `DECLINED`). Shown in the invitee's notifications. Accepting creates a ProjectMember with `EDIT_ASSIGNED`; declining removes the invitation. |
| Phase | A project stage shown on the timeline. "Phase" is the agreed word; there is no separate milestone entity. | Belongs to a project; has a name, a start date, and an end date. Created and edited by the owner. |
| Task | Unit of work shown on the board and timeline. | Title, description, `status`, `priority`, `isBlocked`, `blockedReason`, due date, optional link to one phase, board position, creator, timestamps. |
| TaskAssignee | Links a task to each assigned member. | A task has at least one assignee; every assignee is a project member. |
| ChatMessage | Project chat message. | Project, author, text (not empty), optional referenced task (shown as a link), sent time. |
| ActivityEvent | One entry in the project log (table `activity_events`, Sprint 3). | Project, actor (ID and the username at the time), `type`, task ID and title at the time (for task events), `details` (JSON, by type below), timestamp. Rows are only added. The task ID has no foreign key and the actor is set to null only if the user row goes, so entries stay after a task is deleted or a member leaves. Deleted with the project. |
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
| ActivityEvent `type` | `PROJECT_CREATED`, `PROJECT_UPDATED`, `PROJECT_ARCHIVED`, `PROJECT_RESTORED`, `TASK_CREATED`, `TASK_UPDATED`, `TASK_MOVED`, `TASK_DELETED`, `MEMBER_INVITED`, `INVITATION_CANCELLED`, `INVITATION_DECLINED`, `MEMBER_JOINED`, `MEMBER_ACCESS_CHANGED`, `MEMBER_REMOVED`, `MEMBER_LEFT` |
| Project `reportSchedule` (Could have) | `WEEKLY`, `MONTHLY`, `DISABLED` |

ActivityEvent `details` by type: `TASK_CREATED` `{ status, assignees: [username] }`; `TASK_UPDATED` and `PROJECT_UPDATED` `{ changes: [{ field, from, to }] }`, where `description` carries no values and `assignees` is `{ field, added: [username], removed: [username] }`; `TASK_MOVED` `{ from, to }` (a reorder inside one column is not logged); `TASK_DELETED` `{ status }`; member events `{ userId, username }`, plus `{ from, to }` for `MEMBER_ACCESS_CHANGED`; `PROJECT_CREATED`, `PROJECT_ARCHIVED` and `PROJECT_RESTORED` `{ name }`. `MEMBER_JOINED`, `MEMBER_LEFT` and `INVITATION_DECLINED` have `{}` because the actor is the member. Each entry is written in the same transaction as its change.

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
- Board order uses whole-number positions within each status column (1, 2, 3, ...). A move locks that column's rows (`SELECT ... FOR UPDATE`), shifts the other cards' positions, and saves the moved card in the same transaction. A new task goes to the end of its column. (Decided by Fahad, 5 October 2026.)
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

- Date, timezone, and overdue rules.
- CSV limits, duplicates, and retries.
- Soft deletion and history retention.
