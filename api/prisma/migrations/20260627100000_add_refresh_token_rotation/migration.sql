-- Add refresh token rotation columns to existing refresh_tokens table
-- family_id: groups tokens from the same login session for reuse detection
-- revoked_at: timestamp when token was revoked/rotated (null = still valid)

ALTER TABLE "refresh_tokens" ADD COLUMN IF NOT EXISTS "family_id" TEXT NOT NULL DEFAULT '';
ALTER TABLE "refresh_tokens" ADD COLUMN IF NOT EXISTS "revoked_at" TIMESTAMP(3);

-- Update existing rows: use id as family_id for backward compatibility
UPDATE "refresh_tokens" SET "family_id" = CAST("id" AS TEXT) WHERE "family_id" = '';

-- Create index on family_id for efficient reuse detection queries
CREATE INDEX IF NOT EXISTS "refresh_tokens_family_id_idx" ON "refresh_tokens"("family_id");
