# UI/UX Guidelines

## North star

Khatet should feel like a calm, polished workspace: warm surfaces, grounded green structure, clear hierarchy, and restrained motion. A user should understand what changed, what needs attention, and what action is available without decoding visual effects.

## Design principles

- **Clarity before decoration:** every visual decision should improve clarity, speed, trust, or recovery.
- **One visual language:** use shared type, spacing, radius, border, surface, status, and control tokens.
- **Density with breathing room:** group related information and preserve scan paths on management screens.
- **Progress is visible:** expose status, deadlines, blockers, ownership, and next actions.
- **Familiar metaphors:** use board, task drawer, timeline, milestone, notification, activity feed, and wizard patterns.
- **Recovery is part of UX:** design undo, retry, draft preservation, validation, and explainable errors as first-class states.

## Visual system

Use semantic roles in component APIs instead of raw color names.

| Semantic role | Base value | Use |
| --- | --- | --- |
| `surface.default` | Warm cream `#F6F1E7` | Dominant application background. |
| `text.primary` / navigation | Dark green `#263629` | Headings, navigation, high-contrast text. |
| `action.primary` / active | Olive `#40533F` | Primary actions, selected navigation, active filters. |
| `surface.supporting` | Sage `#AEB79D` | Progress and supporting surfaces. |
| `surface.subtle` | Light sage `#DCE1D2` | Panels and soft backgrounds. |
| `status.attention` / AI / blocked | Terracotta `#C86C4D` | AI, warnings, blockers, overdue tasks, important deadlines. |
| `text.body` | Dark neutral `#242522` | General reading text. |
| `focus.ring` | High-contrast token to be finalized | Keyboard focus must remain visible on every surface. |

Cream should remain dominant. Do not color every card differently. Pair status color with text, icon, pattern, label, or position.

Typography uses a readable sans-serif with a clear page-title, section-title, body, metadata, label, and helper-text hierarchy. Use a predictable spacing scale such as `space-1` through `space-4`; prefer borders and surface changes before heavy shadows.

## Information architecture

The stable shell should provide team/workspace context, project context, Dashboard, Board, Timeline, Tasks, Activity, Import, Settings, notifications, account access, and a clear primary action. Route state should preserve active project, selected task, filters, board view, timeline range, and wizard step when appropriate.

On narrow screens, collapse secondary navigation without hiding current location or making core actions unreachable.

## Screen guidance

### Dashboard

Answer at a glance: how much is complete, what is due soon, what is blocked, what is assigned to me, and which phase needs attention. Use progress, due/overdue tasks, blockers with owner/next action, milestones, recent activity, and phase progress. Each summary should lead to a useful detail or action; do not build a grid of disconnected metrics.

### Kanban board

The board is the primary experience. Use a toolbar with project title, filters, search, view switcher, and Add Task. Columns can be Backlog, To Do, In Progress, Review, and Done. A card should show title, phase, priority, assignee, due date, checklist progress, comment count, and blocker state. Provide Add Task at the bottom of columns and useful empty-column states.

Use dnd-kit for real pointer, touch, and keyboard movement. Show a dashed insertion placeholder and clear destination feedback. After drop, reconcile with the server; on failure restore the previous position and explain retry. Preserve scroll position and do not animate every card.

### Task-detail drawer

Open a right-side drawer on desktop and a full-screen or bottom-sheet surface on smaller screens. Keep title, status, assignee, due date, phase, priority, description, checklist, attachments, AI feedback, comments/chat, and activity understandable in context. On open, manage focus; while modal, trap focus; on close, restore focus and expose a keyboard close action. Use an explicit save action unless autosave behavior is part of the agreed contract.

### Timeline and milestones

Use a clear weekly/monthly time axis, phase grouping, milestone markers, current-date marker, and task bars or summaries. Show late/at-risk work with more than color alone. Provide a compact list representation if the visual timeline becomes hard to scan. Defer complex dependency graphs until the basic timeline is legible and performant.

### Import wizard

Use a visible stepper: Upload/source -> Map -> Review -> Confirm. Validate file type/size and show progress/cancel/retry. Provide clear mapping defaults, editable choices, required-field hints, and sample values. Review missing titles, invalid dates, unknown users, unmapped statuses, warnings, duplicates, skipped rows, and row-level issues. Require explicit confirmation before commit and show final counts, errors, summary, and link to the imported board.

### AI feedback

Present AI as an assistant reviewing project data, not as a decorative chatbot. Show what was reviewed and the available evidence/context. Use a short reviewing state, then small suggestion cards with Accept, Edit, Ignore, and Ask for clarification. Keep original content visible and record accepted decisions in activity. AI must be useful when delayed or unavailable; core project data cannot depend on it.

### Weekly check-in

Collect completed work, planned work, current blocker, and confidence/risk. Preserve editable drafts and make submission visible in the activity/reporting context. Use a simple completion state, not confetti.

## Component system

Use three levels:

| Level | Examples | Rule |
| --- | --- | --- |
| Primitive | Button, Input, Select, Badge, Avatar, Dialog, Drawer, Tooltip, Spinner | Accessible by default, token-driven, keyboard/focus behavior included. |
| Composed pattern | Filter bar, TaskCard, EmptyState, ErrorState, StatusMenu, CommentThread, ProgressSummary | Encodes recurring product patterns and accepts data/callbacks, not route assumptions. |
| Feature screen | Dashboard, Board, Task detail, Timeline, Import, AI feedback | Owns feature orchestration and route state; composes primitives and patterns. |

Every interactive component has a state matrix: default, hover/focus, pressed/selected, disabled/unavailable, loading, empty, error, success/saved, permission, and responsive behavior.

## Accessibility and responsive behavior

- Use semantic HTML and accessible names that describe actions, not icon shapes.
- Make all actions, menus, dialogs, drawers, tabs, forms, and drag alternatives keyboard usable.
- Provide visible, high-contrast focus indicators; manage and restore focus for dialogs/drawers.
- Never communicate status by color alone.
- Honor `prefers-reduced-motion` without removing feedback or making state ambiguous.
- Associate form labels, descriptions, required indicators, and errors through accessible relationships.
- Announce async validation and request results when needed.
- Keep core flows free of horizontal scrolling at laptop/tablet widths; boards may scroll horizontally when controls remain discoverable and touch targets are comfortable.
- Test realistic text lengths, long task names, multiple assignees, empty data, permission limits, and error messages.
- Keep formatting localization-friendly and leave room for future Arabic/English support.

## Motion and performance

Use one main motion system:

- CSS transitions: hover/focus/press, 120-180 ms.
- CSS or Motion: small state changes, 180-240 ms.
- dnd-kit plus transforms: card reorder, 220-320 ms.
- Motion: drawer/modal enter/exit, 280-400 ms.
- Meaningful dashboard reveal: 500-800 ms, without delaying usable content.

Prefer `transform` and `opacity`. Avoid animating width/height/top/left, large blur/backdrop-filter surfaces, heavy shadows, animated gradients, 3D scenes, continuous effects, and JavaScript updates on every mouse/scroll event. Motion should explain a state change, be interruptible, and never be the only proof that an action succeeded.

For a new effect, compare a disabled baseline with an enabled variant using identical data and actions. Test 30, 100, and 300 tasks, long names, avatars, comments, filters, empty/error states, CPU/network throttling, and an actual laptop/tablet where possible. Inspect dropped frames, layout/recalculate/paint work, layout shift, asset size, scroll warnings, and unnecessary rerenders. Keep the effect only when usability benefit, accessibility, and responsiveness justify the cost.

## UX evidence and usability evaluation

Preserve the link between user need, information architecture, prototype decision, implementation, and evaluation result. Record the task scenario, participant/context assumptions, observed issue, severity, design change, and follow-up. A visually polished screen is not evidence of usability by itself.

## Reference and licensing rule

Linear, Plane, Vikunja, Planka, OpenProject, galleries, Motion, dnd-kit, AutoAnimate, Lottie, Rive, and React Bits are references for studying hierarchy and interaction. Do not copy complete screens or assets. Check current licenses before reuse; rebuild with Khatet-owned content, tokens, layout, and components.
