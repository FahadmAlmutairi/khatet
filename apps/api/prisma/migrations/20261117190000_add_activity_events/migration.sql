-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('PROJECT_CREATED', 'PROJECT_UPDATED', 'TASK_CREATED', 'TASK_UPDATED', 'TASK_MOVED', 'TASK_DELETED', 'MEMBER_INVITED', 'INVITATION_CANCELLED', 'INVITATION_DECLINED', 'MEMBER_JOINED', 'MEMBER_ACCESS_CHANGED', 'MEMBER_REMOVED', 'MEMBER_LEFT');

-- CreateTable
CREATE TABLE "activity_events" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "actor_id" UUID,
    "actor_username" TEXT NOT NULL,
    "type" "ActivityType" NOT NULL,
    "task_id" UUID,
    "task_title" TEXT,
    "details" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "activity_events_project_id_created_at_id_idx" ON "activity_events"("project_id", "created_at", "id");

-- CreateIndex
CREATE INDEX "activity_events_project_id_actor_id_created_at_idx" ON "activity_events"("project_id", "actor_id", "created_at");

-- CreateIndex
CREATE INDEX "activity_events_task_id_created_at_idx" ON "activity_events"("task_id", "created_at");

-- AddForeignKey
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Row Level Security (see the enable_rls migration): block Supabase's Data API.
ALTER TABLE "activity_events" ENABLE ROW LEVEL SECURITY;
