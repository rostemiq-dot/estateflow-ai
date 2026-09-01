-- DropIndex
DROP INDEX "client_activities_client_id_created_at_idx";

-- DropIndex
DROP INDEX "clients_agency_id_deleted_at_created_at_idx";

-- DropIndex
DROP INDEX "deals_agency_id_created_at_deleted_at_idx";

-- DropIndex
DROP INDEX "properties_agency_id_created_at_idx";

-- DropIndex
DROP INDEX "properties_agency_id_deleted_at_created_at_idx";

-- CreateIndex
CREATE INDEX "client_activities_client_id_created_at_idx" ON "client_activities"("client_id", "created_at");

-- CreateIndex
CREATE INDEX "clients_agency_id_deleted_at_created_at_idx" ON "clients"("agency_id", "deleted_at", "created_at");

-- CreateIndex
CREATE INDEX "deals_agency_id_created_at_deleted_at_idx" ON "deals"("agency_id", "created_at", "deleted_at");

-- CreateIndex
CREATE INDEX "properties_agency_id_deleted_at_created_at_idx" ON "properties"("agency_id", "deleted_at", "created_at");

-- RenameIndex
ALTER INDEX "viewings_agency_id_assigned_agent_id_start_at_end_at_deleted_at" RENAME TO "viewings_agency_id_assigned_agent_id_start_at_end_at_delete_idx";
