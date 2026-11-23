# API Contract

## Status

Draft frontend/backend agreement, version `0.2`. The API is a Node.js + Express REST service. This document defines endpoint intentions and shared concepts, but not final request/response schemas, pagination, or error codes. Those details must be ratified before implementation. Until then, frontend mocks must follow this document's stable concepts without pretending the contract is final.

## General rules

- Base path: `/api` in the examples below.
- Transport: HTTPS in deployed environments.
- Format: JSON for resource and operation responses; `multipart/form-data` for file upload where required.
- API documentation: REST with OpenAPI. Each route's request and response shape is in the OpenAPI file before the frontend uses it. Request bodies are validated with Zod.
- IDs, timestamps, roles, permissions, and status values are authoritative server data.
- Request bodies must be validated at the API boundary. Never trust project IDs, member IDs, roles, or status values supplied by the browser.
- Each protected query checks project membership, role, and task-access level on the server.
- Every mutation either returns the changed resource in enough detail for cache reconciliation or documents the exact invalidation strategy.
- Slow work returns an identifier and status; a single blocking request is not the contract for AI reports or imports.

## Proposed resource endpoints

These are the initial resource surfaces, not permission to invent unimplemented routes:

```text
GET    /api/me
PATCH  /api/me                                   (username)
GET    /api/health
GET    /api/projects
POST   /api/projects
GET    /api/projects/:projectId
PATCH  /api/projects/:projectId                     (owner: name, description)
POST   /api/projects/:projectId/archive             (owner: archive instead of delete)
DELETE /api/projects/:projectId                     (owner: delete everything now, 204)
GET    /api/archived-projects                       (the signed-in user's archived projects)
GET    /api/archived-projects/:projectId
DELETE /api/archived-projects/:projectId            (delete it for the signed-in user only, 204)
POST   /api/archived-projects/:projectId/restore    (owner: reopen the project)
GET    /api/projects/:projectId/overview
GET    /api/projects/:projectId/members
PATCH  /api/projects/:projectId/members/:userId     (owner: task access)
DELETE /api/projects/:projectId/members/:userId     (owner: remove member)
POST   /api/projects/:projectId/leave               (Team Member)
POST   /api/projects/:projectId/invitations         (owner: invite by username; SEC-02: an unknown username, a member and a pending invitation all get the same 422 on `username`, and each owner may try 20 invitations per 10 minutes, then 429 `RATE_LIMITED`)
DELETE /api/projects/:projectId/invitations/:invitationId  (owner: cancel a pending invitation, 204)
POST   /api/invitations/:invitationId/accept
POST   /api/invitations/:invitationId/decline
GET    /api/projects/:projectId/tasks?assignee=&status=&priority=&q=
POST   /api/projects/:projectId/tasks               (owner, EDIT_ALL)
GET    /api/tasks/:taskId
PATCH  /api/tasks/:taskId
POST   /api/tasks/:taskId/move
DELETE /api/tasks/:taskId                           (owner, EDIT_ALL)
GET    /api/tasks/:taskId/activity
GET    /api/projects/:projectId/activity?actorId=&taskId=&kind=&before=&limit=   (any member: project log)
GET    /api/projects/:projectId/phases
POST   /api/projects/:projectId/phases              (owner)
PATCH  /api/phases/:phaseId                         (owner)
DELETE /api/phases/:phaseId                         (owner, 204)
GET    /api/projects/:projectId/messages?after=:cursor
POST   /api/projects/:projectId/messages
GET    /api/notifications
PATCH  /api/notifications/:notificationId           (mark read)
GET    /api/projects/:projectId/reports
POST   /api/projects/:projectId/reports             (owner: generate AI report)
GET    /api/projects/:projectId/reports/:reportId
GET    /api/projects/:projectId/report-schedule     (any member, Could have)
PATCH  /api/projects/:projectId/report-schedule     (owner, Could have)
POST   /api/internal/scheduled-reports              (scheduled job only, X-Cron-Secret)
POST   /api/projects/:projectId/imports/preview     (owner, Could have)
POST   /api/projects/:projectId/imports/confirm     (owner, Could have)
```

Document each route's ownership and permission rules in OpenAPI before frontend use.

## US-26: Change Project Settings

**Endpoint:** `PATCH /api/projects/:projectId`

**Authorization:** Requires a signed-in user who is the project `OWNER`. Other project members receive `403 FORBIDDEN`; non-members receive `404 NOT_FOUND`.

**Request body (JSON):**

```json
{
  "name": "Updated Project",
  "description": "Updated project description"
}
```

Both fields are optional individually, but at least one must be provided.

- `name`: non-empty string after trimming, maximum 200 characters.
- `description`: string; may be empty to clear the description.
- Unknown fields do not count as updates.

**Success:** `200 OK`, returning the updated project with `id`, `name`, `description`, `createdAt`, `updatedAt`, `role`, `taskAccess`, and `permissions`.

**Errors:**

- `401 UNAUTHENTICATED`: Missing or invalid session.
- `403 FORBIDDEN`: User is a member but not the owner.
- `404 NOT_FOUND`: Project does not exist or user is not a member.
- `422 VALIDATION_FAILED`: Invalid name, description, or empty update.

**Persistence:** Updates are saved in PostgreSQL through Prisma.

## Resource concepts

Resource responses should expose stable identifiers and domain values rather than UI-specific display strings. At minimum, the frontend needs a stable ID, displayable labels or names, timestamps where relevant, explicit status, and permission information needed to render an action. Final field names are a ratification item.

Illustrative task response shape:

```json
{
  "id": "task-id",
  "projectId": "project-id",
  "title": "Prepare usability test script",
  "description": "...",
  "status": "IN_PROGRESS",
  "isBlocked": true,
  "blockedReason": "Waiting for API access",
  "priority": "HIGH",
  "assigneeIds": ["user-id-1", "user-id-2"],
  "phaseId": "phase-id",
  "dueDate": "2026-09-20",
  "updatedAt": "2026-09-13T12:00:00Z",
  "permissions": {
    "canEdit": true,
    "canMove": true,
    "canDelete": false
  }
}
```

The example is illustrative. Do not implement against it until the API team confirms field names, enums, nullability, and permission representation.

## Errors

Use one typed error concept across the API so the UI can explain and recover from failures:

```json
{
  "error": {
    "code": "TASK_UPDATE_FAILED",
    "message": "The task could not be saved.",
    "fieldErrors": [
      {
        "field": "dueDate",
        "message": "Due date must be on or after the project start date."
      }
    ],
    "requestId": "request-id"
  }
}
```

`error.message` is safe for users, `error.code` drives behavior, `error.fieldErrors` maps form feedback, and `error.requestId` supports debugging. Final error codes and HTTP status mapping must be agreed and documented. A failed mutation should preserve input and provide retry or a clear recovery path. Internal diagnostics remain server-side.

## Query and mutation conventions

| Feature | Query/mutation expectation |
| --- | --- |
| Project | Stable `['project', projectId]`; invalidate or reconcile after project changes. |
| Tasks | Stable `['tasks', { projectId, filters }]`; reconcile board moves narrowly rather than refetching everything. |
| Notifications | Stable unread state; avoid broad refetch after unrelated mutations. |
| Task details | Query selected task by URL ID; preserve surrounding board context. |
| Chat | Refresh `['messages', projectId]` every few seconds (at most every 3 seconds, so NFR-09's 5-second delivery holds) with an `after` cursor while the Socket.IO connection is down or the room was refused; while it is joined, `message:new` adds messages at once. |
| AI report | Poll report status until `READY` or `FAILED`. |
| Import | Preview and status are server state; use confirmed results for review/commit. |

Retries must be intentional. Do not automatically retry non-idempotent writes unless the API contract makes retry safe.

## Board movement contract

The move operation needs to communicate the task ID, destination status/column, and ordering information required by the server. The server returns authoritative status and position or a typed failure. The frontend may optimistically move a low-risk card only if it can restore the original position, surface failure, and reconcile with the server.

The UI must not treat animation completion as save success.

## Import contract

1. Preview accepts a CSV file and returns a preview operation plus detected columns/rows/issues.
2. Mapping submits source-to-Khatet field choices and returns a reviewable validation result.
3. Confirm requires explicit user intent and returns an operation identifier.
4. Status exposes progress, counts, warnings, errors, cancellation/retry state, and final next action.

The API must not mutate project data during upload, mapping, or review.

## Chat contract

`GET /api/projects/:projectId/messages` returns the latest 100 messages, oldest first. With `?after=<messageId>` it returns only the messages sent after that one (at most 100), and a cursor that is not a message in this project gets 422 `VALIDATION_FAILED` on the field `after`. Each message has `id`, `projectId`, `authorId`, `authorUsername`, `text` and `createdAt`. `POST` takes `{ "text": "..." }`, trims it and answers 201 with the message; empty text or more than 2000 characters gets 422 `VALIDATION_FAILED` on the field `text`. Both routes check only project membership, so every member can read and send at every access level, and non-members get 404 (NFR-11).

**Task references (US-25, Sprint 3).** A message mentions a task with the token `#[task:<taskId>]` in its `text`. On `POST`, a token whose task is not in the same project gets 422 `VALIDATION_FAILED` on the field `text`. Each message from `GET` (and the `POST` answer) adds `references: [{ taskId, title }]`, one entry per mentioned task with its current title, and `title: null` once the task is deleted. The web app shows each token as a chip that opens the task, or "Deleted task" without a link. Until `references` is sent, the web app takes titles from the board's task list.

**Socket.IO (TR-05, Sprint 3).** Socket.IO runs on the same Express server. The client sends its Supabase access token in the handshake as `auth.token`. It emits `chat:join` with `{ projectId }` and waits for the acknowledgement: `{ ok: true }` once the server has checked membership with the shared policy module and joined the socket to the room `project:<projectId>`, or `{ ok: false, error: { code, message } }`. It emits `chat:leave` with `{ projectId }` when the chat closes. After `POST /messages` saves a message, the server emits `message:new` to the room with the same message object the REST routes return. Messages are still stored and loaded through REST; while the socket is not connected, or the join was refused, the web app refreshes every 3 seconds as before. A handshake without a valid token fails with `UNAUTHENTICATED` (or `USERNAME_REQUIRED` for an account without a username). A member who is removed or leaves, and everyone in an archived or deleted project, is taken out of the room at once. Built in `apps/api/src/realtime/socket.js` (21 Nov 2026).

## Project log contract

The professor asked at the Sprint 2 demo for a project history that survives deleted tasks and departed members, so a reviewer can see what each person did. Every change to tasks, members, invitations and project settings adds an ActivityEvent (docs/data-model.md) in the same transaction.

`GET /api/projects/:projectId/activity`, any member (404 for others, NFR-11), newest first. Query: `actorId` (one person, including former members), `taskId` (one task, including deleted ones), `kind` (`task` for task changes, `member` for members and invitations, `project` for project settings, archiving and phases), `before` (the `nextCursor` of the previous page) and `limit` (1 to 100, default 50); a value of the wrong form gets 422 `VALIDATION_FAILED` on that field. Answers `{ events, nextCursor, actors }`: each event is `{ id, projectId, type, actorId, actorUsername, taskId, taskTitle, details, createdAt }`, `nextCursor` is null on the last page, and `actors` is `[{ id, username }]` for everyone in the log, for the person filter. The web app shows it on the Project log page in the project's sidebar. `GET /api/tasks/:taskId/activity` (US-19) can read the same table with `taskId`.

## Archived projects

Projects are archived instead of deleted, so the project log (who did what) is never lost by one person's action, for example for an assessment after the project ends.

- `POST /api/projects/:projectId/archive`, owner only (403 for a member, 404 for others). Answers the archived project below. In one transaction it copies the summary, removes pending invitations and the project's notifications, adds a `PROJECT_ARCHIVED` log entry and sets `archivedAt`. The owner can restore it (below).
- After that, every project route answers 410 `PROJECT_ARCHIVED` ("This project is archived. Its project log is in Settings, under Archived projects."), except `GET /api/projects/:projectId/activity`, which keeps working for the members the project had when archived. `GET /api/projects` leaves archived projects out.
- `GET /api/archived-projects` lists the signed-in user's archived projects, newest first, and `GET /api/archived-projects/:projectId` answers one (404 if they are not a member or deleted it). Each is `{ id, name, description, createdAt, archivedAt, archivedByUsername, role, summary }`, where `summary` is `{ name, description, createdAt, members: [{ userId, username, role }], tasks: { total, byStatus } }` as copied at archive time.
- `DELETE /api/archived-projects/:projectId` deletes it for the signed-in user only (204); they lose access to its log. When the last member deletes it, the project and everything in it are removed for good.
- `POST /api/archived-projects/:projectId/restore`, owner only, while the owner still has it (403 for a member, 404 if the owner deleted it). Answers `{ id, name }`. The project opens again with its tasks, chat and reports, and a `PROJECT_RESTORED` log entry is added. Members who had deleted their copy come back with the same access, so tasks assigned to them stay valid; the owner can remove them afterwards. Invitations and notifications removed at archive time do not come back.

**Deleting without archiving (US-27).** `DELETE /api/projects/:projectId`, owner only (403 for a member, 404 for others, 410 `PROJECT_ARCHIVED` for an archived project, which is deleted under Archived projects instead), answers 204. It removes the project and everything in it for every member at once, including the project log, so the web app asks the owner to type the project name first. Members who still have it open get 404 on their next request.

The web app shows Archive project on the owner's Project settings page, with a confirmation. Each member finds the archived project under Settings > Archived projects, which opens a read-only page with the summary and the full project log, a Delete permanently action, and for the owner a Restore project action (both with a confirmation). Opening an archived project's old address shows that it is archived, with a link to its log.

## Phases and timeline

US-20 (phases) and US-29 (timeline), Sprint 4. Written on 23 Nov 2026 with the web app's sample server (`apps/web/src/api/mockServer.js`), which already follows it. The web app calls these routes once `apiReady.phases` is on in `apps/web/src/api/config.js`.

A phase is `{ id, projectId, name, startDate, endDate, createdAt, updatedAt }`. `startDate` and `endDate` are calendar days (`YYYY-MM-DD`, no time zone), like a task's `dueDate`; both days are part of the phase.

- `GET /api/projects/:projectId/phases`, any member (404 for others, NFR-11; 410 `PROJECT_ARCHIVED` for an archived project): 200 with `{ phases }`, ordered by `startDate`, then `name`. An empty list when the project has none.
- `POST /api/projects/:projectId/phases`, owner only (403 `FORBIDDEN` for members), body `{ name, startDate, endDate }`: 201 with the phase. The name is trimmed. 422 `VALIDATION_FAILED` with one `fieldErrors` entry per problem: `name` when it is empty or longer than 80 characters, `startDate` or `endDate` when missing or not a `YYYY-MM-DD` day, and `endDate` when it is before `startDate`.
- `PATCH /api/phases/:phaseId`, owner only: any of `name`, `startDate` and `endDate`; the same rules apply to the phase as it will be after the change. 200 with the phase. 404 when the phase does not exist or the user is not a member of its project.
- `DELETE /api/phases/:phaseId`, owner only: 204. The phase's tasks keep everything except the link (`phaseId` becomes `null`, `ON DELETE SET NULL`).
- Tasks: every task response includes `phaseId` (`null` when it has none). `POST /api/projects/:projectId/tasks` and `PATCH /api/tasks/:taskId` accept `phaseId`; `null` clears it, and a phase that is not in the same project gets 422 `VALIDATION_FAILED` on `phaseId`. Changing the phase follows the same task-access rules as the other task fields.
- Project log: `PHASE_CREATED` with `details: { name, startDate, endDate }`, `PHASE_UPDATED` with `details: { name, changes: [{ field, from, to }] }` (fields `name`, `startDate`, `endDate`), and `PHASE_DELETED` with `details: { name }`. These events have no `taskId` and count as `kind=project`. A task's phase change appears inside `TASK_UPDATED` as `{ field: "phase", from, to }`, where `from` and `to` are phase names (or `null` for no phase), so the log still reads correctly after a phase is renamed or deleted.

**Timeline.** There is no timeline route: the Timeline page and the Overview's Timeline card are drawn from `GET /phases` and the task list the board already loads (`GET /api/projects/:projectId/tasks`). Tasks without a `dueDate` are left out of the timeline and only counted. Until `apiReady.phases` is on, the page shows the dated tasks without phases.

## AI report contract

Only the Project Owner can generate a report; every participant can list and read reports with their generation date. `POST /reports` returns a report ID with status `RUNNING`. Within 30 seconds the report becomes `READY` with a summary, warnings, and suggestions, or `FAILED` with a typed error that the UI shows with a retry button. Generating a report never changes tasks, assignments, dates, or permissions, and there is no endpoint to apply a suggestion. Provider credentials stay server-side.

**Sprint 3 shape (US-31, planned 15 Nov 2026).** To fit the sprint, the first version answers in one request instead of the `RUNNING` lifecycle above; the AI call already times out at 30 seconds (`apps/api/src/ai/reportClient.js`). The web app (`apps/web/src/api/client.js`) expects:

- `GET /api/projects/:projectId/reports/latest`, any member: 200 with the report, or 404 `NO_REPORT` when none exists yet.
- `GET /api/projects/:projectId/reports`, any member (404 for others, NFR-11): 200 with `{ reports }`, the project's reports newest first, at most 20, each in the full report shape below. An empty list when none exists yet. The Reports page lists them so members can open an earlier report.
- `POST /api/projects/:projectId/reports`, owner only (403 `FORBIDDEN` for members): 201 with the new report. A second run within 10 minutes gets 429 `REPORT_TOO_SOON` with `nextAllowedAt` (ISO date and time) next to `code` and `message` in the error. AI failures use the codes from `reportClient.js` (`AI_TIMEOUT`, `AI_BUSY`, `AI_QUOTA`, `AI_NOT_CONFIGURED`, `AI_EMPTY_REPORT`, `AI_FAILED`) with a message that is safe to show.
- A report is `{ id, projectId, content, model, promptVersion, createdAt, createdBy: { id, username } }`. `content` is the AI text with the three `## ` headings from `reportPrompt.js`.


**Automatic reports (US-32, Sprint 4).** Written on 23 Nov 2026 with the web app's sample server, which already follows it. The web app calls these routes once `apiReady.reportSchedule` is on.

- A report gains `trigger`: `MANUAL` (made with `POST /reports`) or `AUTOMATIC` (made by the schedule). An automatic report has `createdBy: null`. Automatic reports are in the same `GET /reports` list as manual ones, and `GET /reports/latest` answers whichever is newest.
- `GET /api/projects/:projectId/report-schedule`, any member (404 for others): 200 with `{ frequency, nextRunAt }`. `frequency` is `DISABLED` (the default), `WEEKLY` or `MONTHLY`; `nextRunAt` is an ISO date and time, or `null` while `DISABLED`.
- `PATCH /api/projects/:projectId/report-schedule`, owner only (403 `FORBIDDEN` for members), body `{ frequency }`: 200 with the same shape. Choosing `WEEKLY` sets `nextRunAt` to 7 days from now and `MONTHLY` to the same day next month; `DISABLED` sets it to `null`. Any other value gets 422 `VALIDATION_FAILED` on `frequency`. Archived projects get 410 `PROJECT_ARCHIVED`.
- `POST /api/internal/scheduled-reports` is called by a scheduled GitHub Actions workflow every hour with the header `X-Cron-Secret` (the Render secret `CRON_SECRET`); without the right secret it answers 401 and does nothing. It writes one report for each project whose `nextRunAt` has passed (archived projects are skipped), with the same prompt, timeout and 10-minute guard as `POST /reports`, then moves `nextRunAt` on by 7 days or 1 month. A failed AI call saves nothing and leaves `nextRunAt` as it is, so the next hourly run tries again. It answers 200 with `{ generated, failed }` counts.
- When an automatic report is saved, the owner gets a notification `{ type: "REPORT_READY", projectId, reportId, actorId: null }` in `GET /api/notifications`, with `projectName` like the other notification types. The web app shows "AI report ready" and opens the project's Reports page.
- Generating a report on the schedule changes nothing else in the project, the same rule as for manual reports.

## Authentication and permissions

The web app signs in with Supabase Auth (6-digit email code that expires after 10 minutes and works only once) and sends the Supabase access token as `Authorization: Bearer <token>`. The API verifies the token on every request and on the Socket.IO handshake. A new user must choose a unique username before using projects.

Task access for members:

- `VIEW_ONLY`: read tasks.
- `EDIT_ASSIGNED` (default): edit and move only the tasks assigned to them.
- `EDIT_ALL`: create, edit, move, and delete any task.
- Every member can read and send project chat messages and read phases and the report schedule. Only the owner manages members, invitations, task access, phases, the report schedule, and project settings.
- Removing a member (`DELETE /api/projects/:projectId/members/:userId`) or leaving (`POST /api/projects/:projectId/leave`) answers 409 with code `ONLY_ASSIGNEE` and the affected tasks (one `fieldErrors` entry per task: `field: "tasks"`, `message` is the task title, `taskId` its ID) while that person is the only assignee of a task. The owner cannot leave their own project (403).
- A signed-in user can open only the projects they belong to (NFR-11). Integration tests cover every endpoint with each access level.

In addition:

- Unauthorized requests return a documented authentication error.
- Authenticated but disallowed actions return a documented authorization error.
- The API response should make relevant permissions explicit enough for the UI to hide/disable actions without becoming the security boundary.
- Permission changes and important writes should be auditable.

## Contract checklist before frontend integration

- [ ] Path, method, request schema, response schema, and error responses are documented.
- [ ] IDs, enums, timestamps, nullability, pagination/filtering, and sorting are defined.
- [ ] Auth, membership, role, and task-access checks are documented.
- [ ] Query keys and invalidation/reconciliation behavior are agreed.
- [ ] Report and import status lifecycle, polling, and retry are defined.
- [ ] Mock fixtures cover normal, loading, empty, error, permission, and long-content states.
