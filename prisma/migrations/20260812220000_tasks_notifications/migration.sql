BEGIN;

CREATE TYPE "TaskStatus" AS ENUM ('TODO','IN_PROGRESS','COMPLETED','CANCELLED');
CREATE TYPE "TaskPriority" AS ENUM ('LOW','MEDIUM','HIGH','URGENT');
CREATE TYPE "NotificationType" AS ENUM ('SYSTEM','TASK','GENERAL');

CREATE TABLE "tasks" (
  "id" UUID NOT NULL, "agency_id" UUID NOT NULL, "assigned_user_id" UUID NOT NULL,
  "created_by_id" UUID NOT NULL, "client_id" UUID, "property_id" UUID, "deal_id" UUID,
  "viewing_id" UUID, "title" VARCHAR(180) NOT NULL, "description" TEXT,
  "status" "TaskStatus" NOT NULL DEFAULT 'TODO',
  "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
  "due_at" TIMESTAMPTZ(3), "completed_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL, "deleted_at" TIMESTAMPTZ(3),
  CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "notifications" (
  "id" UUID NOT NULL, "agency_id" UUID NOT NULL, "recipient_id" UUID NOT NULL,
  "client_id" UUID, "property_id" UUID, "deal_id" UUID, "viewing_id" UUID, "task_id" UUID,
  "type" "NotificationType" NOT NULL DEFAULT 'GENERAL', "title" VARCHAR(180) NOT NULL,
  "message" TEXT, "read_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deleted_at" TIMESTAMPTZ(3), CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "tasks_agency_id_assigned_user_id_deleted_at_idx" ON "tasks"("agency_id","assigned_user_id","deleted_at");
CREATE INDEX "tasks_agency_id_status_due_at_deleted_at_idx" ON "tasks"("agency_id","status","due_at","deleted_at");
CREATE INDEX "notifications_agency_id_recipient_id_read_at_deleted_at_idx" ON "notifications"("agency_id","recipient_id","read_at","deleted_at");
CREATE INDEX "notifications_agency_id_created_at_deleted_at_idx" ON "notifications"("agency_id","created_at","deleted_at");

ALTER TABLE "tasks" ADD CONSTRAINT "tasks_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assigned_user_id_fkey" FOREIGN KEY ("assigned_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "deals"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_viewing_id_fkey" FOREIGN KEY ("viewing_id") REFERENCES "viewings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "deals"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_viewing_id_fkey" FOREIGN KEY ("viewing_id") REFERENCES "viewings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT;
