ALTER TABLE "User" ADD COLUMN "contactPhone" TEXT, ADD COLUMN "identityStatus" TEXT NOT NULL DEFAULT 'CLEAR';
ALTER TABLE "User" ADD CONSTRAINT "User_identityStatus_check" CHECK ("identityStatus" IN ('CLEAR','HOLD','DUPLICATE'));
CREATE TABLE "IdentityReview" ("id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL UNIQUE REFERENCES "User"("id"), "candidateIds" TEXT[] NOT NULL, "doctorId" TEXT, "status" TEXT NOT NULL DEFAULT 'PENDING', "reason" TEXT, "reviewedById" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "reviewedAt" TIMESTAMP(3));
CREATE INDEX "IdentityReview_status_createdAt_idx" ON "IdentityReview"("status", "createdAt");
