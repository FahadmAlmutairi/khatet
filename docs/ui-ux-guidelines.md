# UI/UX Guidelines

## North star

Khatet should feel like a calm, polished workspace: neutral surfaces, grounded green structure, clear hierarchy, and restrained motion. A user should understand what changed, what needs attention, and what action is available without decoding visual effects.

## Design principles

- **Clarity before decoration:** every visual decision should improve clarity, speed, trust, or recovery.
- **One visual language:** use shared type, spacing, radius, border, surface, status, and control tokens.
- **Density with breathing room:** group related information and preserve scan paths on management screens.
- **Progress is visible:** expose status, deadlines, blockers, ownership, and next actions.
- **Familiar metaphors:** use board, task drawer, phase, notification, activity feed, and wizard patterns.
- **Recovery is part of UX:** design undo, retry, draft preservation, validation, and explainable errors as first-class states.

## Visual system

Use semantic roles in component APIs instead of raw color names.

| Semantic role | Base value | Use |
| --- | --- | --- |
| `surface.default` | Neutral `#F8FAF7` | Application and sign-in background. |
| `text.primary` / navigation | Dark green `#263629` | Headings, navigation, high-contrast text. |
| `action.primary` / active | Olive `#40533F` | Primary actions, selected navigation, active filters. |
| `surface.supporting` | Sage `#AEB79D` | Progress and supporting surfaces. |
| `surface.subtle` | Light sage `#DCE1D2` | Panels and soft backgrounds. |
| `status.attention` / AI / blocked | Terracotta `#C86C4D` | AI, warnings, blockers, overdue tasks, important deadlines. |
| `text.body` | Dark neutral `#242522` | General reading text. |
| `focus.ring` | 3px dark green `#26362A` ring | Keyboard focus must remain visible on every surface. |

The neutral background should remain dominant; cream `#F6F1E7` is no longer the app background. Do not color every card differently. Primary buttons are solid dark green; pale sage is for secondary buttons only.

Status always shows its text label and a shape icon, because In Progress (teal) and Done (green) can look alike to colour-blind users:

| Status | Icon |
| --- | --- |
| To Do | Ring |
| In Progress (teal) | Half-filled circle |
| Ready for Review | Dot |
| Done | Check |
| Blocked (flag) | Bar |

Priority (Low, Medium, High) also uses text, not color alone.

Typography uses a readable sans-serif with a clear page-title, section-title, body, metadata, label, and helper-text hierarchy. Use a predictable spacing scale such as `space-1` through `space-4`; prefer borders and surface changes before heavy shadows.

## Information architecture

The shell provides project context, Overview, Board, Timeline, Members, project chat, notifications, Project Settings (owner only), and Account settings. "Account settings" (global, one page with Profile & security and Notifications & preferences tabs) and "Project Settings" (per project) are labelled distinctly. New Task and Import are Board actions; tasks are not created from other project pages. Route state should preserve active project, selected task, filters, and wizard step.

On mobile, navigation is a slide-out sidebar opened from the header. There is no bottom tab bar.

## Screen guidance

### Overview

Answer at a glance: how much is complete and what needs attention. Show progress as completed tasks out of total tasks, the tasks assigned to the current user, and a Needs attention section listing overdue and blocked tasks. Each summary should lead to a useful detail or action; do not build a grid of disconnected metrics.

### Kanban board

The board is the primary experience. Use a toolbar with project title, filters (assignee, status, priority) with visible active filters and a clear action, search by title with a no-results message, and Add Task. Columns are Backlog, To Do, In Progress, Ready for Review, and Done; Backlog is kept apart from active work. Blocked is shown on In Progress cards as a flag with its icon and label, not as a column. A card shows title and assignees, and its priority, due date, and Blocked label when set. Provide useful empty-column states.

Use dnd-kit for real pointer, touch, and keyboard movement, and keep a "Move to…" menu on every card as the keyboard and screen-reader alternative. On mobile, the board shows one column at a time with horizontal swipe (Trello-style), neighbouring columns peeking, and previous/next stage labels. Show a dashed insertion placeholder and clear destination feedback. After drop, reconcile with the server; on failure restore the previous position and explain retry. Preserve scroll position and do not animate every card.

### Task-detail drawer

Open a right-side drawer on desktop and a full-screen surface on mobile. Show title, assignees, status, priority, due date, description, phase, the Blocked flag and reason, and task activity (newest first, with who and when). A task must keep at least one assignee. Deleting a task asks for confirmation. Members without edit access see the information without editable controls, with a note that owner permission is required. On open, manage focus; while modal, trap focus; on close, restore focus and expose a keyboard close action. Use an explicit save action unless autosave behavior is part of the agreed contract.

### Timeline and phases

The owner creates and edits phases with a name, start date, and end date, and links each task to at most one phase. The timeline shows phases and tasks with due dates in date order, with a marker for today. Tasks without a due date are not shown on the timeline. Show late work with text as well as color, and provide a list view if the visual timeline is hard to scan.

### Members and invitations

The Members page lists the Project Owner and every Team Member with their task access level. Only the owner sees controls to invite by username, change access, and remove a member (with confirmation). A Team Member can leave a project after confirming; the owner cannot leave. Invitations arrive in notifications with Accept and Decline actions, and the notification bell shows the unread count.

### Project chat

Chat is a collapsible right panel on desktop and full screen on mobile. Every member can use it at every access level. Messages show the sender's username and time, can reference a task, and cannot be empty.

### Import wizard

Use a visible stepper: Upload/source -> Map -> Review -> Confirm. Validate file type/size and show progress/cancel/retry. Provide clear mapping defaults, editable choices, required-field hints, and sample values. Review missing titles, invalid dates, unknown users, unmapped statuses, warnings, duplicates, skipped rows, and row-level issues. Require explicit confirmation before commit and show final counts, errors, summary, and link to the imported board.

### AI project report

The owner generates a report; every participant can read it with the date it was generated. Show a summary of progress, warnings (unrealistic deadlines, overloaded members, long-blocked work), and suggestions. State clearly that the report never changes project data; there are no Accept or Apply buttons. Use terracotta for AI and warnings, with text and icons. Show a generating state, a failed state with a clear message and a Try again button, and an empty state before the first report. Automatic reports (Weekly, Monthly, or Disabled) are a Could have story for Sprint 4; they appear in the same list as manual reports.

## Component system

Use three levels:

| Level | Examples | Rule |
| --- | --- | --- |
| Primitive | Button, Input, Select, Badge, Avatar, Dialog, Drawer, Tooltip, Spinner | Accessible by default, token-driven, keyboard/focus behavior included. |
| Composed pattern | Filter bar, TaskCard, EmptyState, ErrorState, StatusMenu, StatusBadge, ChatMessage, ProgressSummary | Encodes recurring product patterns and accepts data/callbacks, not route assumptions. |
| Feature screen | Overview, Board, Task detail, Timeline, Members, Chat, AI report, Import | Owns feature orchestration and route state; composes primitives and patterns. |

Every interactive component has a state matrix: default, hover/focus, pressed/selected, disabled/unavailable, loading, empty, error, success/saved, permission, and responsive behavior.

## Accessibility and responsive behavior

- Target WCAG 2.2 AA.
- Contrast: 4.5:1 for body text and pill labels; 3:1 for large text, icons, input borders, and focus rings.
- Text size: body text at least 16px (NFR-03); pills and metadata at least 12px; nothing below 11px.
- Touch targets: every button and form field at least 44×44px on a 360px-wide screen (NFR-05).
- Core actions (create a task, change a task's status, invite a member, open chat and send a message) take at most 3 clicks or taps from the board (NFR-01).
- Use semantic HTML and accessible names that describe actions, not icon shapes (for example Notifications, Project chat, Close, More actions, Import tasks, Open sidebar, Send message).
- Make all actions, menus, dialogs, drawers, tabs, forms, and drag alternatives usable with Tab, Shift+Tab, Enter, Space, and Esc, with a visible outline on the focused element (NFR-04).
- Show errors inline next to the field, in text, not only as a red border.
- Explain the email code's expiry and resend cooldown in text, not only as a countdown.
- Give charts and progress bars text equivalents.
- Provide visible, high-contrast focus indicators; manage and restore focus for dialogs/drawers.
- Never communicate status by color alone.
- Honor `prefers-reduced-motion` without removing feedback or making state ambiguous.
- Associate form labels, descriptions, required indicators, and errors through accessible relationships.
- Announce async validation and request results when needed.
- Every page is usable without horizontal page scrolling at 360px, 768px, and 1280px (NFR-16). On mobile the board swipes between columns instead.
- Core tasks work on current Chrome, Edge, Firefox, and Safari (NFR-15).
- Test realistic text lengths, long task names, multiple assignees, empty data, permission limits, and error messages.
- The first release is in English only; Arabic and right-to-left layout are out of scope.

## Motion and performance

Use one main motion system:

- CSS transitions: hover/focus/press, 120-180 ms.
- CSS or Motion: small state changes, 180-240 ms.
- dnd-kit plus transforms: card reorder, 220-320 ms.
- Motion: drawer/modal enter/exit, 280-400 ms.
- Meaningful overview reveal: 500-800 ms, without delaying usable content.

Prefer `transform` and `opacity`. Avoid animating width/height/top/left, large blur/backdrop-filter surfaces, heavy shadows, animated gradients, 3D scenes, continuous effects, and JavaScript updates on every mouse/scroll event. Motion should explain a state change, be interruptible, and never be the only proof that an action succeeded.

Performance targets: main content visible within 3 seconds on Fast 4G for the projects list, board, and task details with 30, 100, and 300 tasks (NFR-07), and results of create task, change status, and send message on screen within 1 second in 9 of 10 attempts (NFR-08).

For a new effect, compare a disabled baseline with an enabled variant using identical data and actions. Test 30, 100, and 300 tasks, long names, avatars, comments, filters, empty/error states, CPU/network throttling, and an actual laptop/tablet where possible. Inspect dropped frames, layout/recalculate/paint work, layout shift, asset size, scroll warnings, and unnecessary rerenders. Keep the effect only when usability benefit, accessibility, and responsiveness justify the cost.

## UX evidence and usability evaluation

Preserve the link between user need, information architecture, prototype decision, implementation, and evaluation result. Record the task scenario, participant/context assumptions, observed issue, severity, design change, and follow-up. A visually polished screen is not evidence of usability by itself.

## Reference and licensing rule

Linear, Plane, Vikunja, Planka, OpenProject, galleries, Motion, dnd-kit, AutoAnimate, Lottie, Rive, and React Bits are references for studying hierarchy and interaction. Do not copy complete screens or assets. Check current licenses before reuse; rebuild with Khatet-owned content, tokens, layout, and components.
