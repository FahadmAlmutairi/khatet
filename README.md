# Khatet

Khatet is a project-management web application for teams. It brings project planning, task tracking, team communication, imports, and project reporting into one workspace.

## Current status

The repository currently contains the agreed project documentation. Application code will be added as implementation begins.

## MVP at a glance

- Projects, members, invitations, and simple permissions.
- Tasks with multiple assignees, priority, status, due date, and milestone.
- Overview, board, backlog, task details, project chat, notifications, and settings.
- CSV import with mapping, validation, preview, and confirmation.
- AI project reports that summarise project progress and suggestions.

Khatet begins with two roles: **Project Owner** and **Team Member**.

For the complete current scope and boundaries, read [Project Overview](docs/project-overview.md).

## Repository map

```text
.
├── README.md
├── AGENTS.md
└── docs/
    ├── project-overview.md
    ├── architecture.md
    ├── api-contract.md
    ├── data-model.md
    └── ui-ux-guidelines.md
```

## Documentation

| Document | Use it for |
| --- | --- |
| [Project Overview](docs/project-overview.md) | Current MVP scope, roles, and boundaries. |
| [Architecture](docs/architecture.md) | Target structure and technology direction. |
| [UI/UX Guidelines](docs/ui-ux-guidelines.md) | Shared interface, interaction, and accessibility decisions. |
| [API Contract](docs/api-contract.md) | Planned frontend and backend data agreement. |
| [Data Model](docs/data-model.md) | Planned entities and relationships. |

The Project Overview is the scope reference. Update a supporting document before using it to expand the MVP.

## Technology direction

- Frontend: React, TypeScript, Vite.
- Backend: Node.js, TypeScript, NestJS, REST/OpenAPI.
- Database: PostgreSQL with Prisma.
- Local development: Docker Compose.
- Checks: GitHub Actions after the application is scaffolded.

## Contributing

1. Create a short branch from the default branch.
2. Keep the branch focused on one feature, fix, or documentation update.
3. Open a pull request before merging shared code.
4. Include relevant tests and documentation updates with implementation changes.
5. Keep secrets, credentials, and local environment files out of Git.

Exact setup and run commands will be added when the application structure is created.
