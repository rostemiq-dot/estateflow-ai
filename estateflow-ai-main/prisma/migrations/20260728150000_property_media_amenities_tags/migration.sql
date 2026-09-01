BEGIN;

CREATE TYPE "PropertyMediaType" AS ENUM ('IMAGE', 'VIDEO', 'PDF', 'FLOOR_PLAN', 'TOUR_360');

CREATE TABLE "property_media" (
    "id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "media_type" "PropertyMediaType" NOT NULL,
    "storage_path" VARCHAR(1000) NOT NULL,
    "thumbnail_path" VARCHAR(1000),
    "file_name" VARCHAR(255) NOT NULL,
    "mime_type" VARCHAR(150) NOT NULL,
    "file_size" BIGINT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "duration" INTEGER,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_cover" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "uploaded_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),
    CONSTRAINT "property_media_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "property_media_file_size_check" CHECK ("file_size" >= 0),
    CONSTRAINT "property_media_dimensions_check" CHECK (("width" IS NULL OR "width" > 0) AND ("height" IS NULL OR "height" > 0)),
    CONSTRAINT "property_media_duration_check" CHECK ("duration" IS NULL OR "duration" >= 0),
    CONSTRAINT "property_media_display_order_check" CHECK ("display_order" >= 0)
);

CREATE TABLE "amenities" (
    "id" UUID NOT NULL,
    "agency_id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "slug" VARCHAR(120) NOT NULL,
    "icon" VARCHAR(120),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),
    CONSTRAINT "amenities_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "property_amenities" (
    "property_id" UUID NOT NULL,
    "amenity_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "property_amenities_pkey" PRIMARY KEY ("property_id", "amenity_id")
);

CREATE TABLE "property_tags" (
    "id" UUID NOT NULL,
    "agency_id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "slug" VARCHAR(120) NOT NULL,
    "color" VARCHAR(7),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),
    CONSTRAINT "property_tags_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "property_tag_assignments" (
    "property_id" UUID NOT NULL,
    "tag_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "property_tag_assignments_pkey" PRIMARY KEY ("property_id", "tag_id")
);

CREATE INDEX "property_media_property_id_deleted_at_display_order_idx" ON "property_media"("property_id", "deleted_at", "display_order");
CREATE INDEX "property_media_property_id_media_type_deleted_at_idx" ON "property_media"("property_id", "media_type", "deleted_at");
CREATE INDEX "property_media_property_id_is_cover_deleted_at_idx" ON "property_media"("property_id", "is_cover", "deleted_at");
CREATE UNIQUE INDEX "property_media_one_active_cover_per_property_key" ON "property_media"("property_id") WHERE "is_cover" = true AND "deleted_at" IS NULL;
CREATE INDEX "property_media_uploaded_by_id_idx" ON "property_media"("uploaded_by_id");
CREATE UNIQUE INDEX "amenities_agency_id_slug_key" ON "amenities"("agency_id", "slug");
CREATE INDEX "amenities_agency_id_deleted_at_name_idx" ON "amenities"("agency_id", "deleted_at", "name");
CREATE INDEX "property_amenities_amenity_id_idx" ON "property_amenities"("amenity_id");
CREATE UNIQUE INDEX "property_tags_agency_id_slug_key" ON "property_tags"("agency_id", "slug");
CREATE INDEX "property_tags_agency_id_deleted_at_name_idx" ON "property_tags"("agency_id", "deleted_at", "name");
CREATE INDEX "property_tag_assignments_tag_id_idx" ON "property_tag_assignments"("tag_id");

ALTER TABLE "property_media" ADD CONSTRAINT "property_media_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "property_media" ADD CONSTRAINT "property_media_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "amenities" ADD CONSTRAINT "amenities_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "property_amenities" ADD CONSTRAINT "property_amenities_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "property_amenities" ADD CONSTRAINT "property_amenities_amenity_id_fkey" FOREIGN KEY ("amenity_id") REFERENCES "amenities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "property_tags" ADD CONSTRAINT "property_tags_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "property_tag_assignments" ADD CONSTRAINT "property_tag_assignments_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "property_tag_assignments" ADD CONSTRAINT "property_tag_assignments_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "property_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;
