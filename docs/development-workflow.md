# Development Workflow

## Purpose

This workflow connects UX research and design with product implementation so that frontend work is testable, accessible, contract-aware, and reviewable.

## Feature workflow

1. **Frame the problem.** Record user goal, route/screen, data needed, permissions, success outcome, failure outcomes, and supporting evidence.
2. **Define the flow.** Produce a wireframe/prototype for the main path plus loading, empty, error, success, permission, responsive, and reduced-motion states.
3. **Agree the contract.** Confirm API endpoint/schema, query keys, mutation behavior, validation, server truth, ownership, and operation lifecycle with the backend team.
4. **Build the states.** Implement/reuse shared primitives first, then feature components, then route composition.
5. **Verify with realistic data.** Test long content, many tasks, slow network, errors, keyboard input, reduced motion, tablet layout, and permission differences.
6. **Review and record.** Run code review, accessibility checks, performance decision, relevant tests, and update status/decision records.

## Branches and commits

- Keep the default branch releasable.
- Use short branches with the `codex/` prefix for agent-created branches; follow the team's agreed prefix for human branches.
- Keep commits focused and describe user-visible intent, for example `feat(board): reconcile task movement after save`.
- Do not mix unrelated formatting, dependency upgrades, or generated files into a feature commit.
- Never commit secrets, personal identifiers, local credentials, or source PDFs unless the team explicitly decides they are project assets and licensing is clear.

## Design-to-code handoff

Every frontend feature should link or point to:

- the UX problem and target scenario;
- information architecture and primary user flow;
- Figma/prototype or wireframe decision;
- component/state matrix;
- responsive and accessibility decisions;
- API/data needs and permission behavior;
- usability findings and known follow-up work.

The implementation should preserve the reason for a design decision, not only its pixels.

## Backend feature workflow

For backend work, use the same loop with these explicit outputs:

1. **Define behavior:** user action, domain rule, permissions, side effects, success/failure states, and data needed by the frontend.
2. **Model the data:** entities, relationships, constraints, indexes, migration, history, and deletion behavior.
3. **Define the contract:** endpoint/command, request schema, response shape, errors, pagination, authentication, and payload examples.
4. **Implement domain logic:** testable services/use cases with validation, transactions, and safe failure behavior before transport glue where practical.
5. **Wire integrations:** database, storage, job system, AI provider, notifications, or external provider behind clear interfaces.
6. **Verify and document:** run tests, inspect logs, update OpenAPI/docs, share fixtures/examples, and state remaining risks.

Before frontend integration, confirm field names, enum values, timestamp format, pagination, nullability, auth requirements, error cases, loading/progress behavior, optimistic-safety, and breaking-change handling.

## Branch and integration workflow

Use one shared integration branch. `main` is the recommended standard; do not keep both `master` and `main` as active integration branches.

Every contributor uses a short-lived branch created from the integration branch:

```text
main
  |-- feat/board-task-movement
  |-- feat/api-import-preview
  |-- fix/task-permission-check
  `-- docs/update-api-contract
```

Open a pull request back into the integration branch. Keep branches focused, update them from the latest integration branch before review, require at least one review for shared code, run CI before merge, and delete merged branches. Personal branches are useful only as short-lived feature branches; do not create a permanent branch per person.

The current remote uses `master` as its only integration branch. Before application development begins, either rename it once to `main` or explicitly adopt `master` and apply the same workflow. Do not create a second long-lived branch just for personal work.

## Frontend/API coordination

- Agree resource IDs, enums, timestamps, nullability, permission representation, errors, pagination/filtering, and operation statuses before integration.
- Build deterministic fixtures for normal, loading, empty, error, permission, and long-content states.
- Keep server state in TanStack Query, URL state in the router, form state in React Hook Form, and local transient state in feature hooks/components.
- Define mutation invalidation or reconciliation before writing the interaction. Optimistic board movement requires rollback and a visible failure path.
- API changes should update OpenAPI/types/mocks and the frontend feature together or include a compatibility plan.

## Testing standard

| Layer | Focus | Suggested tools |
| --- | --- | --- |
| Unit | Formatters, selectors, validation, permissions, data transforms. | Vitest |
| Component | Roles, accessible names, loading/empty/error variants, forms, state changes. | React Testing Library + Vitest |
| Visual | Tokens, variants, responsive layouts, important state changes. | Storybook or equivalent + visual regression |
| E2E | Core cross-component journeys against a controlled API. | Playwright |
| Performance | Startup, board movement, drawer, filtering, import, AI interaction. | DevTools traces, Lighthouse, profiling |

Prefer semantic selectors such as role, accessible name, label, and visible user text. Use stable test IDs only when semantics are insufficient. Assert visible outcomes and important request payloads, not CSS structure or implementation details.

## Minimum core journeys

- Enter test workspace -> open project -> verify shell/context.
- Create/edit task -> valid save -> saved state -> validation/API recovery.
- Move board task -> server-confirmed position -> rollback on failure.
- Open task drawer -> keyboard navigation -> close -> focus restoration.
- Import -> map -> review warnings -> confirm -> progress/final summary.
- AI feedback -> accept/edit/ignore -> original and updated content remain clear.

## Accessibility and performance review

Before review, verify keyboard paths, focus behavior, semantics, color contrast/status encoding, reduced motion, narrow-width layout, touch targets, long text, and async announcements. For motion/effects, capture a baseline/variant comparison and record whether the feature remains responsive at realistic task counts. Useful guidance targets are LCP <= 2.5 seconds, INP <= 200 milliseconds, and CLS <= 0.1.

## Pull request checklist

- [ ] User goal and success outcome are clear.
- [ ] Product scope and ownership are identified.
- [ ] Existing tokens/components/patterns were reused where applicable.
- [ ] Relevant loading, empty, error, success, disabled, permission, and responsive states are present.
- [ ] Forms are typed, labeled, and recoverable.
- [ ] Keyboard, focus, semantics, reduced motion, and color/status behavior were checked.
- [ ] Query keys, invalidation, and mutation reconciliation are intentional.
- [ ] Component/E2E coverage uses semantic selectors.
- [ ] Realistic data and performance impact were checked.
- [ ] Documentation/current status was updated when a decision changed.
- [ ] No secrets, personal notes, or unlicensed copied assets are included.

## Definition of done

The feature is done when the user can understand the state, take the next action, and trust the result. "Looks finished" is insufficient if the feature is unclear, inaccessible, slow, untestable, or impossible to recover from.
