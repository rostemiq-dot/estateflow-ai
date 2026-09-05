-- Reconciliation migration: applied directly to production via Supabase on
-- 2026-09-04. Enforces at most one non-deleted ACCEPTED offer per deal.

BEGIN;

CREATE UNIQUE INDEX "offers_one_accepted_per_deal_idx" ON "offers"("deal_id")
WHERE ("status" = 'ACCEPTED' AND "deleted_at" IS NULL);

COMMIT;
