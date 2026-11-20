-- Archived projects: the project log stays for every member until each of them deletes it.

-- AlterEnum
ALTER TYPE "ActivityType" ADD VALUE 'PROJECT_ARCHIVED';

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "archive_summary" JSONB,
ADD COLUMN     "archived_at" TIMESTAMP(3),
ADD COLUMN     "archived_by_id" UUID;

-- AlterTable
ALTER TABLE "project_members" ADD COLUMN     "archive_removed_at" TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_archived_by_id_fkey" FOREIGN KEY ("archived_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
