# Khatet Contributor Notes

## Start here

Read [docs/project-overview.md](docs/project-overview.md) before making a product or architecture decision. It defines the current MVP scope.

Use the detailed document that matches the work:

- Interface work: [docs/ui-ux-guidelines.md](docs/ui-ux-guidelines.md)
- Frontend/backend agreement: [docs/api-contract.md](docs/api-contract.md)
- Data changes: [docs/data-model.md](docs/data-model.md)
- Structure and stack: [docs/architecture.md](docs/architecture.md)
- Branches, reviews, and testing: [docs/development-workflow.md](docs/development-workflow.md)

## Working rules

1. Reuse existing components, tokens, API types, and patterns before adding a new one.
2. Keep the frontend, API, database, and background work within the agreed technology direction unless the team records a change.
3. Enforce permissions on the backend. The interface may explain unavailable actions, but it is not the security boundary.
4. Use documented API fields and permission rules. Do not invent data shapes or behaviour.
5. Build accessible, responsive states for relevant loading, empty, error, success, and permission cases.
6. Keep AI limited to project reports. It must not alter tasks, assignments, dates, or permissions automatically.
7. Keep secrets and provider keys out of the browser bundle and out of Git.
8. Keep changes focused. Avoid unrelated dependency updates, formatting changes, or generated files in the same pull request.

## Collaboration

- Create a short branch from the default branch.
- Open a pull request before merging shared work.
- State the user-facing change, tests run, and any remaining follow-up work in the pull request.
- Update the relevant documentation when an agreed decision changes.
