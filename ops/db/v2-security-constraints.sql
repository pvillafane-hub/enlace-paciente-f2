-- Constraints preserved from the existing Enlace Salud Fase 3 database.
-- Apply only after creating tables with the reviewed Prisma schema.
-- Each statement is idempotent with respect to constraint name.
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'GuardianLink_active_verified') THEN
  ALTER TABLE "GuardianLink" ADD CONSTRAINT "GuardianLink_active_verified" CHECK (status <> 'ACTIVE' OR (verification IS NOT NULL AND "reviewedById" IS NOT NULL AND "reviewedAt" IS NOT NULL AND "validUntil" IS NOT NULL));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'GuardianLink_distinct_people') THEN
  ALTER TABLE "GuardianLink" ADD CONSTRAINT "GuardianLink_distinct_people" CHECK ("guardianId" <> "patientId");
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'GuardianLink_relationship_check') THEN
  ALTER TABLE "GuardianLink" ADD CONSTRAINT "GuardianLink_relationship_check" CHECK (relationship IN ('PADRE','MADRE','TUTOR_LEGAL'));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'GuardianLink_status_check') THEN
  ALTER TABLE "GuardianLink" ADD CONSTRAINT "GuardianLink_status_check" CHECK (status IN ('PENDING','ACTIVE','REVOKED'));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MedicalAccessRequest_initiatedBy_check') THEN
  ALTER TABLE "MedicalAccessRequest" ADD CONSTRAINT "MedicalAccessRequest_initiatedBy_check" CHECK ("initiatedBy" IS NULL OR "initiatedBy" IN ('DOCTOR'::"Role",'PATIENT'::"Role"));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'User_identityStatus_check') THEN
  ALTER TABLE "User" ADD CONSTRAINT "User_identityStatus_check" CHECK ("identityStatus" IN ('CLEAR','HOLD','DUPLICATE'));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InteropIntegrationDraft_auth_check') THEN
  ALTER TABLE "InteropIntegrationDraft" ADD CONSTRAINT "InteropIntegrationDraft_auth_check" CHECK ("authType" IN ('BEARER','OAUTH2','MTLS'));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InteropIntegrationDraft_direction_check') THEN
  ALTER TABLE "InteropIntegrationDraft" ADD CONSTRAINT "InteropIntegrationDraft_direction_check" CHECK (direction IN ('INBOUND','OUTBOUND'));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InteropIntegrationDraft_protocol_check') THEN
  ALTER TABLE "InteropIntegrationDraft" ADD CONSTRAINT "InteropIntegrationDraft_protocol_check" CHECK (protocol IN ('API_JSON','FHIR_R4','HL7_V2'));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InteropIntegrationDraft_status_check') THEN
  ALTER TABLE "InteropIntegrationDraft" ADD CONSTRAINT "InteropIntegrationDraft_status_check" CHECK (status IN ('DRAFT','PAUSED'));
 END IF;
END $$;
