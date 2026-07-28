-- Align the existing management role with the Phase 2 authorization contract.
ALTER TYPE "UserRole" RENAME VALUE 'MANAGER' TO 'ADMIN';

-- Persist only hashes of rotating refresh tokens.
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "token_hash" CHAR(64) NOT NULL,
    "family_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "revoked_at" TIMESTAMPTZ(3),
    "replaced_by_token_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");
CREATE INDEX "refresh_tokens_user_id_revoked_at_idx" ON "refresh_tokens"("user_id", "revoked_at");
CREATE INDEX "refresh_tokens_family_id_idx" ON "refresh_tokens"("family_id");
CREATE INDEX "refresh_tokens_expires_at_idx" ON "refresh_tokens"("expires_at");

ALTER TABLE "refresh_tokens"
ADD CONSTRAINT "refresh_tokens_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "refresh_tokens_replaced_by_token_id_idx"
ON "refresh_tokens"("replaced_by_token_id");

ALTER TABLE "refresh_tokens"
ADD CONSTRAINT "refresh_tokens_replaced_by_token_id_fkey"
FOREIGN KEY ("replaced_by_token_id") REFERENCES "refresh_tokens"("id")
ON DELETE SET NULL ON UPDATE CASCADE;