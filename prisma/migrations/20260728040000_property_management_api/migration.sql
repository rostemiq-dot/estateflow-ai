BEGIN;

-- Extend users so property assignment can exclude inactive accounts.
ALTER TABLE "users"
ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX "users_agency_id_is_active_idx"
ON "users"("agency_id", "is_active");

-- Replace the legacy property lifecycle without losing existing status values.
ALTER TYPE "PropertyStatus" RENAME TO "PropertyStatus_legacy";

CREATE TYPE "PropertyStatus" AS ENUM (
    'DRAFT',
    'AVAILABLE',
    'RESERVED',
    'SOLD',
    'RENTED',
    'OFF_MARKET'
);

ALTER TABLE "properties"
ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "properties"
ALTER COLUMN "status" TYPE "PropertyStatus"
USING (
    CASE "status"::text
        WHEN 'ACTIVE' THEN 'AVAILABLE'
        WHEN 'PENDING' THEN 'RESERVED'
        WHEN 'ARCHIVED' THEN 'OFF_MARKET'
        ELSE "status"::text
    END
)::"PropertyStatus";

ALTER TABLE "properties"
ALTER COLUMN "status" SET DEFAULT 'DRAFT';

DROP TYPE "PropertyStatus_legacy";

CREATE TYPE "PropertyPurpose" AS ENUM ('SALE', 'RENT');
CREATE TYPE "PropertyType" AS ENUM (
    'APARTMENT',
    'HOUSE',
    'VILLA',
    'LAND',
    'OFFICE',
    'SHOP',
    'WAREHOUSE',
    'BUILDING',
    'OTHER'
);
CREATE TYPE "Currency" AS ENUM ('USD', 'IQD');

-- Rename the existing creator column and add the Phase 3A fields.
ALTER TABLE "properties"
RENAME COLUMN "created_by" TO "created_by_id";

ALTER TABLE "properties"
RENAME CONSTRAINT "properties_created_by_fkey"
TO "properties_created_by_id_fkey";

ALTER TABLE "properties"
ADD COLUMN "assigned_agent_id" UUID,
ADD COLUMN "title" VARCHAR(180),
ADD COLUMN "description" TEXT,
ADD COLUMN "reference_code" VARCHAR(50),
ADD COLUMN "purpose" "PropertyPurpose",
ADD COLUMN "property_type" "PropertyType",
ADD COLUMN "currency" "Currency",
ADD COLUMN "country" VARCHAR(100),
ADD COLUMN "city" VARCHAR(120),
ADD COLUMN "district" VARCHAR(120),
ADD COLUMN "neighborhood" VARCHAR(160),
ADD COLUMN "latitude" DECIMAL(9,6),
ADD COLUMN "longitude" DECIMAL(9,6),
ADD COLUMN "bedrooms" INTEGER,
ADD COLUMN "bathrooms" INTEGER,
ADD COLUMN "area_sqm" DECIMAL(14,2),
ADD COLUMN "floor" INTEGER,
ADD COLUMN "total_floors" INTEGER,
ADD COLUMN "parking_spaces" INTEGER,
ADD COLUMN "year_built" INTEGER,
ADD COLUMN "furnished" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "notes" TEXT,
ADD COLUMN "deleted_at" TIMESTAMPTZ(3);

-- Backfill deterministic, reviewable values for any Phase 1 property rows.
UPDATE "properties"
SET
    "title" = COALESCE(NULLIF(BTRIM("address"), ''), 'Legacy property'),
    "reference_code" = 'LEGACY-' || UPPER(REPLACE("id"::text, '-', '')),
    "purpose" = 'SALE',
    "property_type" = 'OTHER',
    "currency" = 'USD',
    "country" = 'Iraq',
    "city" = 'Unknown';

ALTER TABLE "properties"
ALTER COLUMN "title" SET NOT NULL,
ALTER COLUMN "reference_code" SET NOT NULL,
ALTER COLUMN "purpose" SET NOT NULL,
ALTER COLUMN "property_type" SET NOT NULL,
ALTER COLUMN "currency" SET NOT NULL,
ALTER COLUMN "country" SET NOT NULL,
ALTER COLUMN "city" SET NOT NULL,
ALTER COLUMN "address" DROP NOT NULL;

ALTER TABLE "properties"
ADD CONSTRAINT "properties_assigned_agent_id_fkey"
FOREIGN KEY ("assigned_agent_id") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX "properties_agency_id_reference_code_key"
ON "properties"("agency_id", "reference_code");

DROP INDEX "properties_agency_id_idx";
DROP INDEX "properties_agency_id_status_idx";
DROP INDEX "properties_created_by_idx";

CREATE INDEX "properties_agency_id_deleted_at_idx"
ON "properties"("agency_id", "deleted_at");

CREATE INDEX "properties_agency_id_status_deleted_at_idx"
ON "properties"("agency_id", "status", "deleted_at");

CREATE INDEX "properties_agency_id_assigned_agent_id_deleted_at_idx"
ON "properties"("agency_id", "assigned_agent_id", "deleted_at");

CREATE INDEX "properties_agency_id_city_deleted_at_idx"
ON "properties"("agency_id", "city", "deleted_at");

CREATE INDEX "properties_agency_id_property_type_deleted_at_idx"
ON "properties"("agency_id", "property_type", "deleted_at");

CREATE INDEX "properties_created_by_id_idx"
ON "properties"("created_by_id");

CREATE INDEX "properties_agency_id_deleted_at_created_at_idx"
ON "properties"("agency_id", "deleted_at", "created_at" DESC);

COMMIT;