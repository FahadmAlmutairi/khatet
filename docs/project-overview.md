# Khatet Project Overview

## Purpose

Khatet is a web application for student teams to plan project work, track tasks, communicate in context, and review progress in one place.

## Current MVP scope

- Account access and project creation.
- Project Owner and Team Member roles.
- Project membership, invitations, and simple per-member permissions.
- Tasks with a required title and optional details such as multiple assignees, priority, status, due date, and milestone.
- Overview, board, backlog, task details, project chat, notifications, and project settings.
- CSV import with mapping, validation, preview, and confirmation.
- AI project reports that summarise authorised project data and provide suggestions.

The Project Owner has full project access. A Team Member can view the project and receives additional capabilities only when the owner grants them.

## Scope boundaries

The MVP does not include AI task review, AI task assignment, an AI chatbot, custom roles, supervisor roles, or direct imports from external task tools. CSV is the first import format.

## Technology direction

| Area | Direction |
| --- | --- |
| Web app | React, TypeScript, Vite |
| API | Node.js, TypeScript, NestJS, REST/OpenAPI |
| Data | PostgreSQL and Prisma |
| Testing | Unit, component, and end-to-end tests as the app is built |
| Deployment | Docker Compose for local development and GitHub Actions for checks |

These are the team’s current technical directions. Record an agreed change in the relevant documentation before implementation diverges.

## Repository status

The repository currently contains project documentation. Application source, exact setup commands, environment examples, and automated checks will be added when implementation begins.

## Working agreement

1. Start each change from the default branch.
2. Use a short branch for one focused task.
3. Open a pull request before merging shared code.
4. Keep product scope and API changes documented.
5. Never commit secrets, credentials, or local environment files.

## Related documentation

- [README](../README.md): quick start and repository map.
- [Architecture](architecture.md): target application structure and technical boundaries.
- [API contract](api-contract.md): API planning reference.
- [Data model](data-model.md): data planning reference.
- [UI/UX guidelines](ui-ux-guidelines.md): design and interaction reference.
- [Development workflow](development-workflow.md): detailed implementation and review guidance.

The overview defines the current MVP scope. Supporting documents should be updated before they introduce or change scope.
