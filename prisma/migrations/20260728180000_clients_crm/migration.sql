BEGIN;

CREATE TYPE "ClientRoleType" AS ENUM ('BUYER', 'SELLER', 'LANDLORD', 'TENANT', 'INVESTOR', 'DEVELOPER');
CREATE TYPE "ClientLeadStatus" AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'NURTURING', 'CONVERTED', 'LOST');
CREATE TYPE "ClientLeadSource" AS ENUM ('REFERRAL', 'WEBSITE', 'SOCIAL_MEDIA', 'PROPERTY_PORTAL', 'WALK_IN', 'PHONE', 'OTHER');
CREATE TYPE "ClientPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
CREATE TYPE "ClientActivityType" AS ENUM ('CALL', 'WHATSAPP', 'EMAIL', 'MEETING', 'VIEWING', 'NOTE', 'OFFER', 'DEAL_CREATED');

CREATE TABLE "clients" (
    "id" UUID NOT NULL,
    "agency_id" UUID NOT NULL,
    "assigned_agent_id" UUID,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "full_name" VARCHAR(201) NOT NULL,
    "email" VARCHAR(320),
    "phone" VARCHAR(30) NOT NULL,
    "secondary_phone" VARCHAR(30),
    "whatsapp" VARCHAR(30),
    "nationality" VARCHAR(100),
    "preferred_language" VARCHAR(50),
    "company" VARCHAR(160),
    "lead_status" "ClientLeadStatus" NOT NULL DEFAULT 'NEW',
    "lead_source" "ClientLeadSource",
    "priority" "ClientPriority" NOT NULL DEFAULT 'MEDIUM',
    "rating" INTEGER,
    "notes" TEXT,
    "next_follow_up_at" TIMESTAMPTZ(3),
    "last_contact_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),
    CONSTRAINT "clients_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "clients_rating_check" CHECK ("rating" IS NULL OR ("rating" >= 1 AND "rating" <= 5))
);

CREATE TABLE "client_roles" (
    "client_id" UUID NOT NULL,
    "role" "ClientRoleType" NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "client_roles_pkey" PRIMARY KEY ("client_id", "role")
);

CREATE TABLE "client_preferences" (
    "id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "property_type" "PropertyType" NOT NULL,
    "city" VARCHAR(120) NOT NULL,
    "district" VARCHAR(120),
    "bedrooms" INTEGER,
    "bathrooms" INTEGER,
    "min_area" DECIMAL(14,2),
    "max_area" DECIMAL(14,2),
    "min_budget" DECIMAL(18,2),
    "max_budget" DECIMAL(18,2),
    "currency" "Currency" NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),
    CONSTRAINT "client_preferences_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "client_preferences_bedrooms_check" CHECK ("bedrooms" IS NULL OR "bedrooms" >= 0),
    CONSTRAINT "client_preferences_bathrooms_check" CHECK ("bathrooms" IS NULL OR "bathrooms" >= 0),
    CONSTRAINT "client_preferences_area_check" CHECK (
        ("min_area" IS NULL OR "min_area" >= 0) AND
        ("max_area" IS NULL OR "max_area" >= 0) AND
        ("min_area" IS NULL OR "max_area" IS NULL OR "min_area" <= "max_area")
    ),
    CONSTRAINT "client_preferences_budget_check" CHECK (
        ("min_budget" IS NULL OR "min_budget" >= 0) AND
        ("max_budget" IS NULL OR "max_budget" >= 0) AND
        ("min_budget" IS NULL OR "max_budget" IS NULL OR "min_budget" <= "max_budget")
    )
);

CREATE TABLE "client_tags" (
    "id" UUID NOT NULL,
    "agency_id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "slug" VARCHAR(120) NOT NULL,
    "color" VARCHAR(7),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),
    CONSTRAINT "client_tags_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "client_tag_assignments" (
    "client_id" UUID NOT NULL,
    "tag_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "client_tag_assignments_pkey" PRIMARY KEY ("client_id", "tag_id")
);

CREATE TABLE "client_activities" (
    "id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "activity_type" "ClientActivityType" NOT NULL,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "client_activities_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "clients_agency_id_deleted_at_created_at_idx" ON "clients"("agency_id", "deleted_at", "created_at" DESC);
CREATE INDEX "clients_agency_id_assigned_agent_id_deleted_at_idx" ON "clients"("agency_id", "assigned_agent_id", "deleted_at");
CREATE INDEX "clients_agency_id_lead_status_deleted_at_idx" ON "clients"("agency_id", "lead_status", "deleted_at");
CREATE INDEX "clients_agency_id_lead_source_deleted_at_idx" ON "clients"("agency_id", "lead_source", "deleted_at");
CREATE INDEX "clients_agency_id_priority_deleted_at_idx" ON "clients"("agency_id", "priority", "deleted_at");
CREATE INDEX "clients_agency_id_full_name_idx" ON "clients"("agency_id", "full_name");
CREATE INDEX "clients_agency_id_phone_idx" ON "clients"("agency_id", "phone");
CREATE INDEX "clients_agency_id_email_idx" ON "clients"("agency_id", "email");
CREATE INDEX "clients_assigned_agent_id_idx" ON "clients"("assigned_agent_id");
CREATE INDEX "client_roles_role_client_id_idx" ON "client_roles"("role", "client_id");
CREATE INDEX "client_preferences_client_id_deleted_at_idx" ON "client_preferences"("client_id", "deleted_at");
CREATE INDEX "client_preferences_property_type_city_idx" ON "client_preferences"("property_type", "city");
CREATE UNIQUE INDEX "client_tags_agency_id_slug_key" ON "client_tags"("agency_id", "slug");
CREATE INDEX "client_tags_agency_id_deleted_at_name_idx" ON "client_tags"("agency_id", "deleted_at", "name");
CREATE INDEX "client_tag_assignments_tag_id_client_id_idx" ON "client_tag_assignments"("tag_id", "client_id");
CREATE INDEX "client_activities_client_id_created_at_idx" ON "client_activities"("client_id", "created_at" DESC);
CREATE INDEX "client_activities_created_by_id_idx" ON "client_activities"("created_by_id");
CREATE INDEX "client_activities_activity_type_idx" ON "client_activities"("activity_type");

ALTER TABLE "clients" ADD CONSTRAINT "clients_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "clients" ADD CONSTRAINT "clients_assigned_agent_id_fkey" FOREIGN KEY ("assigned_agent_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "client_roles" ADD CONSTRAINT "client_roles_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "client_preferences" ADD CONSTRAINT "client_preferences_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "client_tags" ADD CONSTRAINT "client_tags_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "client_tag_assignments" ADD CONSTRAINT "client_tag_assignments_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "client_tag_assignments" ADD CONSTRAINT "client_tag_assignments_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "client_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "client_activities" ADD CONSTRAINT "client_activities_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "client_activities" ADD CONSTRAINT "client_activities_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

COMMIT;
