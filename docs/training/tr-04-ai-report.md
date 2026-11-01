# TR-04: AI API training and TF-14 test call

Owner: Salman Almazyad (took over TF-14 and the TR-04 evidence from Hamzah; recorded in Trello).
Date: 2 November 2026. Branch: `TF-14-and-TR-04`.

## What was learned

- Calling the OpenAI Responses API from Node.js with the official `openai` package: a system prompt (`instructions`), the user input, a model name, and an output length limit (`max_output_tokens`).
- Setting a 30-second timeout and turning off automatic retries, so the user gets an error with a retry button instead of a long wait (A-05, NFR-17).
- Reading the API's errors: timeout, 429 "too many requests", `insufficient_quota` (no credit left), 401 (bad key) and 404 (unknown model). Each is mapped to a Khatet error code in `apps/api/src/ai/reportClient.js`.
- Keeping the key secret: it is only in `apps/api/.env` (ignored by Git) and in Render's Environment settings, never in the browser or the repository.
- Testing without the real API: the Vitest tests fake the OpenAI client, so GitHub Actions never needs the key or spends credit.

## Prompt template

Committed in `apps/api/src/ai/reportPrompt.js` (prompt version 1). The AI receives only a limited project summary (task counts per status, overdue, due this week, blocked tasks, each member's workload) and must answer under three headings: Progress summary, Warnings, Suggestions. It is told to use only the facts given and never invent tasks, people, dates or numbers.

## Test call results (A-05)

Command, run in `apps/api`: `node scripts/ai-test-call.js --sample` (a made-up sample project, no real data).

| Run | Model | Time | Tokens in / out |
|---|---|---|---|
| 1 | gpt-6-luna | 5.3 s | 668 / 329 |
| 2 | gpt-6-luna | 3.8 s | 668 / 327 |
| 3 | gpt-6-luna | 5.2 s | 668 / 291 |

- All three calls returned a report well within the 30-second limit.
- Each report used the three headings, flagged the real problems in the sample (one member with 4 open tasks, an overdue task, a task blocked for 11 days) and invented nothing. No prompt changes were needed, so the prompt stays at version 1.
- Cost: COST_TO_CONFIRM (from the OpenAI dashboard Usage page).

## Decision

Provider: OpenAI API, model `gpt-6-luna` (Sprint 0 report, Section 7.4 decision). The Claude API was also checked, but it requires buying prepaid credit before any call.

## Follow-up

- US-31 (Sprint 3) builds the report route and screen on top of `summarizeProject`, `loadProjectData` and `generateReport`.
- Add `OPENAI_API_KEY` to Render's Environment settings with a separate production key, before US-31 is deployed.
