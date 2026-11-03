CREATE TABLE "InteropIntegrationDraft" (
  "id" TEXT NOT NULL, "name" TEXT NOT NULL, "code" TEXT NOT NULL,
  "protocol" TEXT NOT NULL, "direction" TEXT NOT NULL, "endpoint" TEXT,
  "authType" TEXT NOT NULL, "credentialRef" TEXT, "reviewAll" BOOLEAN NOT NULL DEFAULT true,
  "notes" TEXT, "status" TEXT NOT NULL DEFAULT 'DRAFT', "version" INTEGER NOT NULL DEFAULT 1,
  "createdById" TEXT NOT NULL, "updatedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InteropIntegrationDraft_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "InteropIntegrationDraft_protocol_check" CHECK ("protocol" IN ('API_JSON','FHIR_R4','HL7_V2')),
  CONSTRAINT "InteropIntegrationDraft_direction_check" CHECK ("direction" IN ('INBOUND','OUTBOUND')),
  CONSTRAINT "InteropIntegrationDraft_auth_check" CHECK ("authType" IN ('BEARER','OAUTH2','MTLS')),
  CONSTRAINT "InteropIntegrationDraft_status_check" CHECK ("status" IN ('DRAFT','PAUSED'))
);
CREATE UNIQUE INDEX "InteropIntegrationDraft_code_key" ON "InteropIntegrationDraft"("code");
CREATE INDEX "InteropIntegrationDraft_status_updatedAt_idx" ON "InteropIntegrationDraft"("status", "updatedAt");
