ALTER TABLE "Document" ADD COLUMN "proxyVisible" BOOLEAN NOT NULL DEFAULT false;
CREATE TABLE "GuardianLink" (
  "id" TEXT NOT NULL,
  "guardianId" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "relationship" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "canUpload" BOOLEAN NOT NULL DEFAULT false,
  "verification" TEXT,
  "requestedById" TEXT NOT NULL,
  "reviewedById" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "validUntil" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GuardianLink_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "GuardianLink_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "GuardianLink_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "GuardianLink_distinct_people" CHECK ("guardianId" <> "patientId"),
  CONSTRAINT "GuardianLink_status_check" CHECK ("status" IN ('PENDING','ACTIVE','REVOKED')),
  CONSTRAINT "GuardianLink_relationship_check" CHECK ("relationship" IN ('PADRE','MADRE','TUTOR_LEGAL')),
  CONSTRAINT "GuardianLink_active_verified" CHECK ("status" <> 'ACTIVE' OR ("verification" IS NOT NULL AND "reviewedById" IS NOT NULL AND "reviewedAt" IS NOT NULL AND "validUntil" IS NOT NULL))
);
CREATE UNIQUE INDEX "GuardianLink_guardianId_patientId_key" ON "GuardianLink"("guardianId", "patientId");
CREATE INDEX "GuardianLink_guardianId_status_validUntil_idx" ON "GuardianLink"("guardianId", "status", "validUntil");
CREATE INDEX "GuardianLink_status_createdAt_idx" ON "GuardianLink"("status", "createdAt");
