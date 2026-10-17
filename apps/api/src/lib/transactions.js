// Time limits for multi-step transactions: prisma.$transaction(async (tx) => { ... }, TRANSACTION_OPTIONS)
// Prisma's defaults (wait 2 s for a connection, finish within 5 s) are too short when
// writes in one project wait their turn behind a row lock, or when the database is far
// away (a laptop in Riyadh to the dev database in Singapore takes about 1 s per query).
export const TRANSACTION_OPTIONS = { maxWait: 10_000, timeout: 20_000 }
