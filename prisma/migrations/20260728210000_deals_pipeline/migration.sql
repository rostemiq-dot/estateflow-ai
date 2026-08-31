BEGIN;

CREATE TYPE "DealType" AS ENUM ('SALE','RENTAL','LEASE','DEVELOPMENT','INVESTMENT','OTHER');
CREATE TYPE "DealStage" AS ENUM ('NEW_LEAD','QUALIFIED','PROPERTY_MATCHED','VIEWING_SCHEDULED','OFFER_SUBMITTED','NEGOTIATION','CONTRACT','WON','LOST');
CREATE TYPE "DealStatus" AS ENUM ('OPEN','WON','LOST','CANCELLED');
CREATE TYPE "CommissionType" AS ENUM ('FIXED','PERCENTAGE');

CREATE TABLE "deals" (
  "id" UUID NOT NULL, "agency_id" UUID NOT NULL, "client_id" UUID NOT NULL,
  "property_id" UUID NOT NULL, "assigned_agent_id" UUID NOT NULL,
  "title" VARCHAR(180) NOT NULL, "deal_type" "DealType" NOT NULL,
  "stage" "DealStage" NOT NULL DEFAULT 'NEW_LEAD', "status" "DealStatus" NOT NULL DEFAULT 'OPEN',
  "asking_price" DECIMAL(18,2), "offer_amount" DECIMAL(18,2), "agreed_amount" DECIMAL(18,2),
  "currency" "Currency" NOT NULL, "expected_commission" DECIMAL(18,4),
  "commission_type" "CommissionType", "expected_close_at" TIMESTAMPTZ(3),
  "closed_at" TIMESTAMPTZ(3), "lost_reason" VARCHAR(1000), "description" TEXT,
  "created_by_id" UUID NOT NULL, "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL, "deleted_at" TIMESTAMPTZ(3),
  CONSTRAINT "deals_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "deals_financial_values_check" CHECK (
    ("asking_price" IS NULL OR "asking_price" >= 0) AND
    ("offer_amount" IS NULL OR "offer_amount" >= 0) AND
    ("agreed_amount" IS NULL OR "agreed_amount" >= 0) AND
    ("expected_commission" IS NULL OR "expected_commission" >= 0)
  ),
  CONSTRAINT "deals_commission_check" CHECK (
    ("commission_type" IS NULL AND "expected_commission" IS NULL) OR
    ("commission_type" = 'FIXED' AND "expected_commission" IS NOT NULL) OR
    ("commission_type" = 'PERCENTAGE' AND "expected_commission" BETWEEN 0 AND 100)
  ),
  CONSTRAINT "deals_stage_status_check" CHECK (
    ("stage" = 'WON' AND "status" = 'WON' AND "closed_at" IS NOT NULL) OR
    ("stage" = 'LOST' AND "status" = 'LOST' AND "closed_at" IS NOT NULL AND NULLIF(BTRIM("lost_reason"), '') IS NOT NULL) OR
    ("stage" NOT IN ('WON','LOST') AND "status" NOT IN ('WON','LOST'))
  )
);

CREATE TABLE "deal_stage_history" (
  "id" UUID NOT NULL, "deal_id" UUID NOT NULL, "from_stage" "DealStage",
  "to_stage" "DealStage" NOT NULL, "changed_by_id" UUID NOT NULL,
  "note" VARCHAR(2000), "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "deal_stage_history_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "deal_notes" (
  "id" UUID NOT NULL, "deal_id" UUID NOT NULL, "body" TEXT NOT NULL,
  "created_by_id" UUID NOT NULL, "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL, "deleted_at" TIMESTAMPTZ(3),
  CONSTRAINT "deal_notes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "deals_agency_id_stage_deleted_at_idx" ON "deals"("agency_id","stage","deleted_at");
CREATE INDEX "deals_agency_id_status_deleted_at_idx" ON "deals"("agency_id","status","deleted_at");
CREATE INDEX "deals_agency_id_assigned_agent_id_deleted_at_idx" ON "deals"("agency_id","assigned_agent_id","deleted_at");
CREATE INDEX "deals_agency_id_expected_close_at_deleted_at_idx" ON "deals"("agency_id","expected_close_at","deleted_at");
CREATE INDEX "deals_agency_id_created_at_deleted_at_idx" ON "deals"("agency_id","created_at" DESC,"deleted_at");
CREATE INDEX "deals_client_id_idx" ON "deals"("client_id");
CREATE INDEX "deals_property_id_idx" ON "deals"("property_id");
CREATE INDEX "deals_assigned_agent_id_idx" ON "deals"("assigned_agent_id");
CREATE INDEX "deals_created_by_id_idx" ON "deals"("created_by_id");
CREATE INDEX "deal_stage_history_deal_id_created_at_idx" ON "deal_stage_history"("deal_id","created_at");
CREATE INDEX "deal_stage_history_changed_by_id_idx" ON "deal_stage_history"("changed_by_id");
CREATE INDEX "deal_notes_deal_id_deleted_at_created_at_idx" ON "deal_notes"("deal_id","deleted_at","created_at");
CREATE INDEX "deal_notes_created_by_id_idx" ON "deal_notes"("created_by_id");

ALTER TABLE "deals" ADD CONSTRAINT "deals_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "deals" ADD CONSTRAINT "deals_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "deals" ADD CONSTRAINT "deals_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "deals" ADD CONSTRAINT "deals_assigned_agent_id_fkey" FOREIGN KEY ("assigned_agent_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "deals" ADD CONSTRAINT "deals_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "deal_stage_history" ADD CONSTRAINT "deal_stage_history_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "deal_stage_history" ADD CONSTRAINT "deal_stage_history_changed_by_id_fkey" FOREIGN KEY ("changed_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "deal_notes" ADD CONSTRAINT "deal_notes_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "deal_notes" ADD CONSTRAINT "deal_notes_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

COMMIT;
