-- Existing requests have no verifiable initiator. Keep NULL until explicitly renewed.
ALTER TABLE "MedicalAccessRequest" ADD COLUMN "initiatedBy" "Role";
ALTER TABLE "MedicalAccessRequest" ADD CONSTRAINT "MedicalAccessRequest_initiatedBy_check" CHECK ("initiatedBy" IS NULL OR "initiatedBy" IN ('DOCTOR', 'PATIENT'));
