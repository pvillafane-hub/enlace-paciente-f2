-- Multi-Tenant V1: isolated Neon preproduction fixture regression.
-- Execute ONLY on branch multitenant-v1-preprod-validation.
-- Requires synthetic IDs mt-test-grant-a, mt-test-grant-a2, mt-test-grant-positive.
-- No writes; raises an error if any expected denial becomes an effective grant.
DO $$
DECLARE
  checked_count integer;
  allowed_count integer;
BEGIN
  WITH cases AS (
    SELECT g.id,
      (g.status = 'ACTIVE'
       AND g."revokedAt" IS NULL
       AND (g."validUntil" IS NULL OR g."validUntil" > now())
       AND o.status = 'ACTIVE'
       AND po.active
       AND om.active
       AND om.role = 'DOCTOR'
       AND u.active
       AND u.role = 'DOCTOR') AS allowed
    FROM "MedicalAccessGrant" g
    JOIN "Organization" o ON o.id = g."organizationId"
    JOIN "PatientOrganization" po
      ON po."organizationId" = g."organizationId"
     AND po."patientId" = g."patientId"
    JOIN "OrganizationMember" om
      ON om."organizationId" = g."organizationId"
     AND om."userId" = g."doctorId"
    JOIN "User" u ON u.id = g."doctorId"
    WHERE g.id IN ('mt-test-grant-a', 'mt-test-grant-a2', 'mt-test-grant-positive')
  )
  SELECT count(*), count(*) FILTER (WHERE allowed)
    INTO checked_count, allowed_count
  FROM cases;

  IF checked_count <> 3 OR allowed_count <> 0 THEN
    RAISE EXCEPTION 'Multi-Tenant V1 denial regression failed: checked %, incorrectly allowed %',
      checked_count, allowed_count;
  END IF;
  RAISE NOTICE 'Multi-Tenant V1 denial regression passed: 3/3 denied';
END $$;
