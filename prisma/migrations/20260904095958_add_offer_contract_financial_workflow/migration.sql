-- Reconciliation migration: this schema was applied directly to production via
-- Supabase on 2026-09-04 (migration "add_offer_contract_financial_workflow")
-- but the SQL was never committed to this repository.
-- This migration is additive only: no existing table is altered or dropped.

BEGIN;

CREATE TYPE "OfferStatus" AS ENUM ('DRAFT','SENT','COUNTERED','ACCEPTED','REJECTED','EXPIRED');
CREATE TYPE "ContractStatus" AS ENUM ('DRAFT','UNDER_REVIEW','READY_TO_SIGN','SIGNED','CANCELLED');
CREATE TYPE "PaymentMethod" AS ENUM ('CASH','BANK_TRANSFER','CARD','CHEQUE','OTHER');
CREATE TYPE "FinancialStatus" AS ENUM ('PENDING','PARTIALLY_PAID','PAID','OVERDUE','CANCELLED');

CREATE TABLE "offers" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "agency_id" UUID NOT NULL, "deal_id" UUID NOT NULL, "parent_offer_id" UUID,
  "amount" DECIMAL(18,2) NOT NULL, "currency" TEXT NOT NULL, "offer_date" TIMESTAMPTZ NOT NULL DEFAULT now(), "expiration_date" TIMESTAMPTZ,
  "conditions" TEXT NOT NULL DEFAULT '', "notes" TEXT NOT NULL DEFAULT '', "status" "OfferStatus" NOT NULL DEFAULT 'DRAFT',
  "created_by_id" UUID NOT NULL, "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(), "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(), "deleted_at" TIMESTAMPTZ,
  CONSTRAINT "offers_pkey" PRIMARY KEY ("id"), CONSTRAINT "offers_amount_check" CHECK ("amount" >= 0), CONSTRAINT "offers_currency_check" CHECK ("currency" IN ('USD','IQD'))
);

CREATE TABLE "contracts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "agency_id" UUID NOT NULL, "deal_id" UUID NOT NULL, "offer_id" UUID NOT NULL, "client_id" UUID NOT NULL, "property_id" UUID NOT NULL,
  "contract_number" VARCHAR(80) NOT NULL, "contract_type" TEXT NOT NULL, "status" "ContractStatus" NOT NULL DEFAULT 'DRAFT', "agreed_amount" DECIMAL(18,2) NOT NULL,
  "currency" TEXT NOT NULL, "deposit_amount" DECIMAL(18,2) NOT NULL DEFAULT 0, "commission_amount" DECIMAL(18,2) NOT NULL DEFAULT 0, "start_date" DATE NOT NULL, "end_date" DATE,
  "terms" TEXT NOT NULL DEFAULT '', "clauses" JSONB NOT NULL DEFAULT '[]', "notes" TEXT NOT NULL DEFAULT '', "responsible_agent_id" UUID NOT NULL, "signed_snapshot" JSONB, "signed_at" TIMESTAMPTZ,
  "created_by_id" UUID NOT NULL, "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(), "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(), "deleted_at" TIMESTAMPTZ,
  CONSTRAINT "contracts_pkey" PRIMARY KEY ("id"), CONSTRAINT "contracts_offer_id_key" UNIQUE ("offer_id"), CONSTRAINT "contracts_agency_id_contract_number_key" UNIQUE ("agency_id","contract_number"),
  CONSTRAINT "contracts_agreed_amount_check" CHECK ("agreed_amount" >= 0), CONSTRAINT "contracts_deposit_amount_check" CHECK ("deposit_amount" >= 0), CONSTRAINT "contracts_commission_amount_check" CHECK ("commission_amount" >= 0),
  CONSTRAINT "contracts_contract_type_check" CHECK ("contract_type" IN ('SALE','RENTAL')), CONSTRAINT "contracts_currency_check" CHECK ("currency" IN ('USD','IQD'))
);

CREATE TABLE "contract_versions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "contract_id" UUID NOT NULL, "version" INTEGER NOT NULL, "changed_fields" JSONB NOT NULL DEFAULT '[]', "summary" VARCHAR(1000) NOT NULL,
  "snapshot" JSONB NOT NULL, "created_by_id" UUID NOT NULL, "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(), CONSTRAINT "contract_versions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "contract_versions_contract_id_version_key" UNIQUE ("contract_id","version"), CONSTRAINT "contract_versions_version_check" CHECK ("version" > 0)
);

CREATE TABLE "commissions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "agency_id" UUID NOT NULL, "deal_id" UUID NOT NULL, "contract_id" UUID, "mode" TEXT NOT NULL, "rate" DECIMAL(9,4) NOT NULL DEFAULT 0,
  "fixed_amount" DECIMAL(18,2) NOT NULL DEFAULT 0, "agent_share_rate" DECIMAL(9,4) NOT NULL DEFAULT 50, "calculated_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "confirmed" BOOLEAN NOT NULL DEFAULT false, "confirmed_at" TIMESTAMPTZ, "created_by_id" UUID NOT NULL, "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(), "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "commissions_pkey" PRIMARY KEY ("id"), CONSTRAINT "commissions_deal_id_key" UNIQUE ("deal_id"), CONSTRAINT "commissions_contract_id_key" UNIQUE ("contract_id"),
  CONSTRAINT "commissions_mode_check" CHECK ("mode" IN ('PERCENTAGE','FIXED')), CONSTRAINT "commissions_rate_check" CHECK ("rate" >= 0 AND "rate" <= 100), CONSTRAINT "commissions_fixed_amount_check" CHECK ("fixed_amount" >= 0),
  CONSTRAINT "commissions_agent_share_rate_check" CHECK ("agent_share_rate" >= 0 AND "agent_share_rate" <= 100), CONSTRAINT "commissions_calculated_amount_check" CHECK ("calculated_amount" >= 0)
);

CREATE TABLE "payment_schedules" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "agency_id" UUID NOT NULL, "deal_id" UUID NOT NULL, "contract_id" UUID, "label" VARCHAR(180) NOT NULL,
  "amount" DECIMAL(18,2) NOT NULL, "currency" TEXT NOT NULL, "due_date" DATE NOT NULL, "status" "FinancialStatus" NOT NULL DEFAULT 'PENDING', "notes" TEXT NOT NULL DEFAULT '',
  "created_by_id" UUID NOT NULL, "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(), "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(), CONSTRAINT "payment_schedules_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "payment_schedules_amount_check" CHECK ("amount" >= 0), CONSTRAINT "payment_schedules_currency_check" CHECK ("currency" IN ('USD','IQD'))
);

CREATE TABLE "payment_records" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "agency_id" UUID NOT NULL, "schedule_id" UUID NOT NULL, "amount" DECIMAL(18,2) NOT NULL, "paid_date" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "method" "PaymentMethod" NOT NULL, "reference" VARCHAR(180) NOT NULL DEFAULT '', "notes" TEXT NOT NULL DEFAULT '', "created_by_id" UUID NOT NULL, "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "payment_records_pkey" PRIMARY KEY ("id"), CONSTRAINT "payment_records_amount_check" CHECK ("amount" > 0)
);

CREATE INDEX "offers_agency_deal_idx" ON "offers"("agency_id","deal_id");
CREATE INDEX "offers_deal_status_idx" ON "offers"("deal_id","status");
CREATE INDEX "contracts_deal_idx" ON "contracts"("deal_id");
CREATE INDEX "contracts_agency_status_idx" ON "contracts"("agency_id","status");
CREATE INDEX "contract_versions_contract_idx" ON "contract_versions"("contract_id","version" DESC);
CREATE INDEX "payment_schedules_deal_idx" ON "payment_schedules"("deal_id","due_date");
CREATE INDEX "payment_records_schedule_idx" ON "payment_records"("schedule_id","paid_date" DESC);

ALTER TABLE "offers" ADD CONSTRAINT "offers_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE CASCADE;
ALTER TABLE "offers" ADD CONSTRAINT "offers_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "deals"("id") ON DELETE CASCADE;
ALTER TABLE "offers" ADD CONSTRAINT "offers_parent_offer_id_fkey" FOREIGN KEY ("parent_offer_id") REFERENCES "offers"("id") ON DELETE SET NULL;
ALTER TABLE "offers" ADD CONSTRAINT "offers_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT;
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE CASCADE;
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "deals"("id") ON DELETE RESTRICT;
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "offers"("id") ON DELETE RESTRICT;
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT;
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT;
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_responsible_agent_id_fkey" FOREIGN KEY ("responsible_agent_id") REFERENCES "users"("id") ON DELETE RESTRICT;
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT;
ALTER TABLE "contract_versions" ADD CONSTRAINT "contract_versions_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE CASCADE;
ALTER TABLE "contract_versions" ADD CONSTRAINT "contract_versions_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT;
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE CASCADE;
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "deals"("id") ON DELETE RESTRICT;
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE SET NULL;
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT;
ALTER TABLE "payment_schedules" ADD CONSTRAINT "payment_schedules_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE CASCADE;
ALTER TABLE "payment_schedules" ADD CONSTRAINT "payment_schedules_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "deals"("id") ON DELETE RESTRICT;
ALTER TABLE "payment_schedules" ADD CONSTRAINT "payment_schedules_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE SET NULL;
ALTER TABLE "payment_schedules" ADD CONSTRAINT "payment_schedules_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT;
ALTER TABLE "payment_records" ADD CONSTRAINT "payment_records_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE CASCADE;
ALTER TABLE "payment_records" ADD CONSTRAINT "payment_records_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "payment_schedules"("id") ON DELETE CASCADE;
ALTER TABLE "payment_records" ADD CONSTRAINT "payment_records_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT;

COMMIT;
