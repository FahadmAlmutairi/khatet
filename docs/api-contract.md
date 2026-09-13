# API Contract

## Status

Draft frontend/backend agreement, version `0.1`. The source documents define REST/OpenAPI and a set of endpoint intentions, but they do not define final DTOs, pagination, authentication transport, or error codes. Those details must be ratified before implementation. Until then, frontend mocks must follow this document's stable concepts without pretending the contract is final.

## General rules

- Base path: `/api` in the examples below.
- Transport: HTTPS in deployed environments.
- Format: JSON for resource and operation responses; `multipart/form-data` for file upload where required.
- API documentation: OpenAPI generated from NestJS DTOs and validation decorators/schemas.
- IDs, timestamps, roles, permissions, and status values are authoritative server data.
- Request bodies must be validated at the API boundary. Never trust project IDs, member IDs, roles, or status values supplied by the browser.
- Each protected query checks project/team membership and role permissions on the server.
- Every mutation either returns the changed resource in enough detail for cache reconciliation or documents the exact invalidation strategy.
- Slow work returns an operation/job identifier and status; a single blocking request is not the contract for imports, AI reviews, or reports.

## Proposed resource endpoints

These are the initial resource surfaces, not permission to invent unimplemented routes:

```text
GET    /api/projects
GET    /api/projects/:projectId
POST   /api/projects
GET    /api/projects/:projectId/tasks
POST   /api/projects/:projectId/tasks
PATCH  /api/tasks/:taskId
POST   /api/tasks/:taskId/comments
POST   /api/imports/preview
POST   /api/imports/confirm
GET    /api/projects/:projectId/reports/progress
```

Likely supporting surfaces include teams/memberships, phases/milestones, activity, notifications, files, AI reviews, weekly check-ins, and operation status. Add them to OpenAPI with explicit ownership and permission rules before frontend use.

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
  "priority": "HIGH",
  "assigneeId": "member-id",
  "phaseId": "phase-id",
  "dueDate": "2026-09-20",
  "updatedAt": "2026-09-13T12:00:00Z",
  "permissions": {
    "canEdit": true,
    "canMove": true,
    "canComment": true
  }
}
```

The example is illustrative. Do not implement against it until the API team confirms field names, enums, nullability, and permission representation.

## Errors

Use one typed error concept across the API so the UI can explain and recover from failures:

```json
{
  "message": "The task could not be saved.",
  "code": "TASK_UPDATE_FAILED",
  "fieldErrors": {
    "dueDate": "Due date must be on or after the project start date."
  },
  "requestId": "request-id"
}
```

`message` is safe for users, `code` drives behavior, `fieldErrors` maps form feedback, and `requestId` supports debugging. Final error codes and HTTP status mapping must be agreed in OpenAPI. A failed mutation should preserve input and provide retry or a clear recovery path.

## Query and mutation conventions

| Feature | Query/mutation expectation |
| --- | --- |
| Project | Stable `['project', projectId]`; invalidate or reconcile after project changes. |
| Tasks | Stable `['tasks', { projectId, filters }]`; reconcile board moves narrowly rather than refetching everything. |
| Notifications | Stable team/project scope and unread state; avoid broad refetch after unrelated mutations. |
| Task drawer | Query selected task by URL ID; preserve surrounding board context. |
| Import | Preview and operation status are server state; use confirmed results for review/commit. |
| AI review | Poll/subscribe to operation status and suggestions; never block task save. |
| Reports/check-ins | Use server-confirmed saved/generated state and preserve editable drafts. |

Retries must be intentional. Do not automatically retry non-idempotent writes unless the API contract makes retry safe.

## Board movement contract

The move operation needs to communicate the task ID, destination status/column, and ordering information required by the server. The server returns authoritative status and position or a typed failure. The frontend may optimistically move a low-risk card only if it can restore the original position, surface failure, and reconcile with the server.

The UI must not treat animation completion as save success.

## Import contract

1. Preview accepts supported file/source metadata and returns a preview operation plus detected columns/rows/issues.
2. Mapping submits source-to-Khatet field choices and returns a reviewable validation result.
3. Confirm requires explicit user intent and returns an operation identifier.
4. Status exposes progress, counts, warnings, errors, cancellation/retry state, and final next action.

The API must not mutate project data during upload, mapping, or review.

## AI contract

Task save returns immediately. An AI review operation exposes reviewing, ready, accepted, edited, ignored, failed, and retrying states plus suggestions and evidence/context where available. Accept/edit/ignore/clarify are user decisions and must create auditable activity. Provider credentials stay server-side.

## Authentication and permissions

The team must choose and document the auth transport before implementation. Regardless of transport:

- Unauthorized requests return a documented authentication error.
- Authenticated but disallowed actions return a documented authorization error.
- The API response should make relevant permissions explicit enough for the UI to hide/disable actions without becoming the security boundary.
- Permission changes and important writes should be auditable.

## Contract checklist before frontend integration

- [ ] OpenAPI path, method, request schema, response schema, and error responses exist.
- [ ] IDs, enums, timestamps, nullability, pagination/filtering, and sorting are defined.
- [ ] Auth, membership, and role checks are documented.
- [ ] Query keys and invalidation/reconciliation behavior are agreed.
- [ ] Slow-operation lifecycle, polling/subscription, retry, and cancellation are defined.
- [ ] Mock fixtures cover normal, loading, empty, error, permission, and long-content states.
