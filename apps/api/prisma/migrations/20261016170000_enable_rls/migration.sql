-- Turn on Row Level Security with no policies on every table.
-- The browser holds the Supabase publishable key for sign-in, and Supabase's
-- Data API would otherwise let anyone read and change these tables directly.
-- With RLS on and no policies, the Data API sees nothing. The Express API is
-- not affected: it connects as the table owner, which RLS does not restrict.
-- All project data goes through Express (docs/architecture.md, guardrails).
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "projects" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "project_members" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "invitations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;
-- Prisma's own history table. IF EXISTS because Prisma's temporary check database
-- (the "shadow database") does not have it.
ALTER TABLE IF EXISTS "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
