BEGIN;

CREATE TYPE "ViewingStatus" AS ENUM ('SCHEDULED','CONFIRMED','RESCHEDULED','COMPLETED','CANCELLED','NO_SHOW');
CREATE TYPE "DealActivityType" AS ENUM ('VIEWING_SCHEDULED');

CREATE TABLE "viewings" (
  "id" UUID NOT NULL, "agency_id" UUID NOT NULL, "property_id" UUID NOT NULL,
  "client_id" UUID NOT NULL, "deal_id" UUID, "assigned_agent_id" UUID NOT NULL,
  "title" VARCHAR(180) NOT NULL, "description" TEXT,
  "status" "ViewingStatus" NOT NULL DEFAULT 'SCHEDULED',
  "start_at" TIMESTAMPTZ(3) NOT NULL, "end_at" TIMESTAMPTZ(3) NOT NULL,
  "timezone" VARCHAR(100) NOT NULL, "location" VARCHAR(500),
  "outcome" VARCHAR(2000), "cancellation_reason" VARCHAR(1000), "feedback" TEXT,
  "created_by_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL, "deleted_at" TIMESTAMPTZ(3),
  CONSTRAINT "viewings_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "viewings_time_range_check" CHECK ("start_at" < "end_at"),
  CONSTRAINT "viewings_status_fields_check" CHECK (
    ("status" <> 'COMPLETED' OR NULLIF(BTRIM("outcome"), '') IS NOT NULL) AND
    ("status" <> 'CANCELLED' OR NULLIF(BTRIM("cancellation_reason"), '') IS NOT NULL)
  )
);

CREATE TABLE "deal_activities" (
  "id" UUID NOT NULL, "deal_id" UUID NOT NULL, "viewing_id" UUID NOT NULL,
  "activity_type" "DealActivityType" NOT NULL, "description" TEXT NOT NULL,
  "created_by_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "deal_activities_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "client_activities" ADD COLUMN "viewing_id" UUID;

CREATE INDEX "viewings_agency_id_start_at_deleted_at_idx" ON "viewings"("agency_id","start_at","deleted_at");
CREATE INDEX "viewings_agency_id_status_start_at_deleted_at_idx" ON "viewings"("agency_id","status","start_at","deleted_at");
CREATE INDEX "viewings_agency_id_assigned_agent_id_start_at_end_at_deleted_at_idx" ON "viewings"("agency_id","assigned_agent_id","start_at","end_at","deleted_at");
CREATE INDEX "viewings_client_id_idx" ON "viewings"("client_id");
CREATE INDEX "viewings_property_id_idx" ON "viewings"("property_id");
CREATE INDEX "viewings_deal_id_idx" ON "viewings"("deal_id");
CREATE INDEX "viewings_assigned_agent_id_idx" ON "viewings"("assigned_agent_id");
CREATE INDEX "viewings_created_by_id_idx" ON "viewings"("created_by_id");
CREATE INDEX "deal_activities_deal_id_created_at_idx" ON "deal_activities"("deal_id","created_at");
CREATE INDEX "deal_activities_created_by_id_idx" ON "deal_activities"("created_by_id");
CREATE UNIQUE INDEX "client_activities_viewing_id_key" ON "client_activities"("viewing_id");
CREATE UNIQUE INDEX "deal_activities_viewing_id_key" ON "deal_activities"("viewing_id");

ALTER TABLE "viewings" ADD CONSTRAINT "viewings_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "viewings" ADD CONSTRAINT "viewings_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "viewings" ADD CONSTRAINT "viewings_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "viewings" ADD CONSTRAINT "viewings_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "deals"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "viewings" ADD CONSTRAINT "viewings_assigned_agent_id_fkey" FOREIGN KEY ("assigned_agent_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "viewings" ADD CONSTRAINT "viewings_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "deal_activities" ADD CONSTRAINT "deal_activities_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "deal_activities" ADD CONSTRAINT "deal_activities_viewing_id_fkey" FOREIGN KEY ("viewing_id") REFERENCES "viewings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "deal_activities" ADD CONSTRAINT "deal_activities_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "client_activities" ADD CONSTRAINT "client_activities_viewing_id_fkey" FOREIGN KEY ("viewing_id") REFERENCES "viewings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;
