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
DELETE /api/projects/:projectId                     (owner)
GET    /api/projects/:projectId/overview
GET    /api/projects/:projectId/members
PATCH  /api/projects/:projectId/members/:userId     (owner: task access)
DELETE /api/projects/:projectId/members/:userId     (owner: remove member)
POST   /api/projects/:projectId/leave               (Team Member)
POST   /api/projects/:projectId/invitations         (owner: invite by username)
POST   /api/invitations/:invitationId/accept
POST   /api/invitations/:invitationId/decline
GET    /api/projects/:projectId/tasks?assignee=&status=&priority=&q=
POST   /api/projects/:projectId/tasks               (owner, EDIT_ALL)
GET    /api/tasks/:taskId
PATCH  /api/tasks/:taskId
POST   /api/tasks/:taskId/move
DELETE /api/tasks/:taskId                           (owner, EDIT_ALL)
GET    /api/tasks/:taskId/activity
GET    /api/projects/:projectId/phases
POST   /api/projects/:projectId/phases              (owner)
PATCH  /api/phases/:phaseId                         (owner)
GET    /api/projects/:projectId/timeline
GET    /api/projects/:projectId/messages?after=:cursor
POST   /api/projects/:projectId/messages
GET    /api/notifications
PATCH  /api/notifications/:notificationId           (mark read)
GET    /api/projects/:projectId/reports
POST   /api/projects/:projectId/reports             (owner: generate AI report)
GET    /api/projects/:projectId/reports/:reportId
PATCH  /api/projects/:projectId/report-schedule     (owner, Could have)
POST   /api/projects/:projectId/imports/preview     (owner, Could have)
POST   /api/projects/:projectId/imports/confirm     (owner, Could have)
```

Document each route's ownership and permission rules in OpenAPI before frontend use.

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
| Chat | Refresh `['messages', projectId]` every few seconds (at most every 3 seconds, so NFR-09's 5-second delivery holds) with an `after` cursor until Socket.IO replaces refreshing. |
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

## AI report contract

Only the Project Owner can generate a report; every participant can list and read reports with their generation date. `POST /reports` returns a report ID with status `RUNNING`. Within 30 seconds the report becomes `READY` with a summary, warnings, and suggestions, or `FAILED` with a typed error that the UI shows with a retry button. Generating a report never changes tasks, assignments, dates, or permissions, and there is no endpoint to apply a suggestion. Provider credentials stay server-side.

## Authentication and permissions

The web app signs in with Supabase Auth (6-digit email code that expires after 10 minutes and works only once) and sends the Supabase access token as `Authorization: Bearer <token>`. The API verifies the token on every request and on the Socket.IO handshake. A new user must choose a unique username before using projects.

Task access for members:

- `VIEW_ONLY`: read tasks.
- `EDIT_ASSIGNED` (default): edit and move only the tasks assigned to them.
- `EDIT_ALL`: create, edit, move, and delete any task.
- Every member can read and send project chat messages. Only the owner manages members, invitations, task access, phases, and project settings.
- Removing a member (`DELETE /api/projects/:projectId/members/:userId`) or leaving (`POST /api/projects/:projectId/leave`) answers 409 with code `ONLY_ASSIGNEE` and the affected tasks while that person is the only assignee of a task. The owner cannot leave their own project (403).
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
