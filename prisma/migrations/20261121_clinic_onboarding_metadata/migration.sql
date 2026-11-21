-- Additive clinic onboarding metadata; no existing organizations are removed.
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "address" TEXT;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "city" TEXT;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "contactName" TEXT;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "plan" TEXT;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "activatedAt" TIMESTAMP(3);
