# Product Requirements

## Document status

Draft baseline for the Khatet MVP. Requirements are derived from the supplied project brief, frontend handbook, UI/animation notes, and technology/architecture notes. Implementation decisions that need backend/frontend agreement are marked as decisions to ratify.

## Product vision

Khatet turns scattered tasks, dates, conversations, documents, and status updates into visible project progress in one calm, dependable workspace.

## Problem

Teams often split work among messaging apps, spreadsheets, shared drives, and documents. Important decisions lose context, ownership is unclear, and progress or weekly reporting takes unnecessary effort. Khatet connects task ownership, phases, milestones, deadlines, notifications, dashboards, task-linked conversations, and AI-generated project documents around the project itself.

## Users

| User | Primary needs |
| --- | --- |
| Team member | See assigned work, update status, discuss a task, report blockers, and understand deadlines. |
| Team owner or lead | Set up a project, assign work, monitor risk, and keep the team aligned. |
| Supervisor | See project health, milestones, blockers, and progress without collecting updates manually. |
| Organization administrator | Manage adoption, isolation, roles, and governance across teams. |

## Product outcomes

The MVP succeeds when a team can set up a project, manage daily work, keep task conversations attached to the work, monitor progress and risk, import existing work safely, and create consistent reports or documentation from information already in Khatet.

## Functional requirements

### Accounts, teams, and projects

- A user can sign in or enter a controlled test workspace during development.
- A user can create or join a team/project and see the current workspace and project context at all times.
- A project supports members, roles, permissions, phases, milestones, and a project health/progress summary.
- Protected data is isolated by membership and enforced by the backend. The UI may hide or disable unavailable actions but is never the security boundary.

### Tasks and planning

- A team can create and edit tasks with a title, description, owner, priority, status, due date, phase, milestone relationship where applicable, labels, checklist, attachments, and activity.
- The board represents status values as columns and supports reordering and movement between columns.
- A timeline presents phases, milestones, current date, task timing, and late or at-risk work in a legible laptop/tablet layout.
- A user can filter and search tasks without losing project context.

### Communication and alerts

- A task has a linked conversation/comment thread so discussion remains attached to the work it describes.
- The product exposes relevant activity, unread state, and deadline/update notifications.
- Activity history records important task, import, AI, and project changes in an understandable way.

### Import

- The first import flow supports CSV.
- The flow is: upload/source -> map -> review -> confirm.
- The UI validates file type/size, displays progress and retry/cancel states, maps columns with defaults and required-field hints, shows row-level issues and duplicates, and requires explicit confirmation before commit.
- The user sees a final result count, errors, summary, and a next action. Import failures must not silently change the project.

### AI assistance and documents

- Task creation/editing can trigger a non-blocking AI review.
- AI may suggest ownership, estimates, task splitting, missing owners, unrealistic deadlines, dependencies, or workload risks.
- Suggestions have explicit reviewing, ready, accepted, edited, ignored, failed, and retrying states.
- Users can accept, edit, ignore, or ask for clarification. The original content remains understandable and auditable.
- Progress/risk reports and official letters can be generated from project data and edited before export or sharing.
- Core project management remains usable when AI is delayed or unavailable; no AI key is present in the browser.

### Weekly check-in

- A member can report completed work, planned work, current blockers, and confidence/risk.
- A submitted check-in becomes visible in the activity/project reporting context.

## Frontend experience requirements

- The shell keeps team/project context, primary navigation, notifications, account access, and the primary action discoverable.
- The dashboard answers: What is the project status? What is due soon? What is blocked? What should I do next?
- The board keeps task identity, title, owner, due date, and blocker state visible at scan distance.
- The task detail uses a drawer on wide screens and a full-screen or bottom-sheet equivalent on narrow screens.
- Every meaningful screen supports loading, empty, error, saved/success, permission, and responsive states.
- Core actions work with keyboard and touch, not only a pointer.

## Non-functional requirements

- Accessibility is a product requirement: semantic HTML, accessible names, visible focus, focus management, reduced motion, status not conveyed by color alone, and keyboard alternatives for drag-and-drop.
- Core flows support laptop and tablet widths without horizontal scrolling except where board/timeline interaction requires a discoverable, comfortable scroll surface.
- Prefer responsive interactions and measurable performance over decorative effects. Use useful targets of LCP <= 2.5 seconds, INP <= 200 ms, and CLS <= 0.1 as performance guidance.
- The backend owns authorization, validation, transaction boundaries, and authoritative IDs/status/timestamps.
- Long-running imports, AI reviews, reports, and notifications are asynchronous and recoverable.
- The data model is prepared for multi-tenant isolation, audit history, backups, monitoring, rate limiting, secure password handling, HTTPS, and future Arabic/English readiness.

## Delivery evidence

| Product implementation evidence | UX evidence |
| --- | --- |
| Working REST API, database, AI/import services, tests, deployment, authorization, and integration. | Research, information architecture, wireframes/prototypes, design system, accessibility rationale, usability evaluation, and frontend interaction quality. |

Shared evidence includes the working frontend, API contract, test journeys, screenshots/traces where useful, decisions, and current status.

## First-version scope guardrails

Defer 3D boards, full-screen route transitions, cursor-following effects, heavy parallax, continuous gradients, confetti, excessive glassmorphism, complex dependency graphs, broad third-party integrations, university SSO, and ChatGPT/MCP integration until the core product is stable.

Direct Google Sheets, Trello, and Asana imports remain future extensions after CSV import is reliable.

## Acceptance journeys

1. Enter the test workspace, open a project, and verify shell/project context.
2. Create or edit a task, submit valid data, see the saved state, and recover from validation/API failure without losing input.
3. Move a task on the board, observe server-confirmed position, and recover with rollback and explanation when movement fails.
4. Open a task drawer, navigate controls by keyboard, close it, and verify focus restoration.
5. Run an import, map a field, review warnings, confirm, and observe progress plus final summary.
6. Open AI feedback, accept/edit/ignore a suggestion, and verify original and updated content remain understandable.
