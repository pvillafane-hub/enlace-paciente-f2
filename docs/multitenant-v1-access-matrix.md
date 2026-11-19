# Multi-Tenant V1 — reproducible authorization checks

Run **only** against the isolated Neon branch `br-noisy-breeze-b80fo28m` with synthetic records. This is a read-only SQL matrix; it does **not** test Next.js session handling or HTTP routes.

Expected synthetic fixtures:
- patient: `mt-test-patient`
- clinic A/B: `mt-test-org-a`, `mt-test-org-b`
- doctor A/B: `mt-test-doctor-a`, `mt-test-doctor-b`
- clinic A association: `mt-test-association-a` (active)
- `mt-test-grant-a` revoked; `mt-test-grant-a2` active but expired

```sql
WITH cases AS (
  SELECT 'expired grant' AS scenario, 'mt-test-org-a' AS org, 'mt-test-doctor-a' AS doctor
  UNION ALL
  SELECT 'other clinic without consent', 'mt-test-org-b', 'mt-test-doctor-b'
  UNION ALL
  SELECT 'revoked grant', 'mt-test-org-a', 'mt-test-doctor-a'
),
checks AS (
  SELECT c.scenario,
    EXISTS (
      SELECT 1 FROM "OrganizationMember" m
      JOIN "Organization" o ON o.id = m."organizationId"
      JOIN "User" d ON d.id = m."userId"
      WHERE m."organizationId" = c.org AND m."userId" = c.doctor
        AND m.active AND m.role = 'DOCTOR'
        AND o.status = 'ACTIVE' AND d.active AND d.role = 'DOCTOR'
    ) AS doctor_active,
    EXISTS (
      SELECT 1 FROM "PatientOrganization" p
      WHERE p."organizationId" = c.org
        AND p."patientId" = 'mt-test-patient' AND p.active
    ) AS patient_associated,
    EXISTS (
      SELECT 1 FROM "MedicalAccessGrant" g
      WHERE g."organizationId" = c.org
        AND g."patientId" = 'mt-test-patient'
        AND g."doctorId" = c.doctor
        AND g.status = 'ACTIVE' AND g."revokedAt" IS NULL
        AND (g."validUntil" IS NULL OR g."validUntil" > now())
    ) AS valid_grant
  FROM cases c
)
SELECT scenario, doctor_active, patient_associated, valid_grant,
  (doctor_active AND patient_associated AND valid_grant) AS allowed
FROM checks;
```

Expected `allowed = false` for all three rows. This query intentionally checks only authorization predicates; app-level audit, session identity, Prisma schema validation, and document endpoint behavior require separate automated integration tests.

**Release gates (not yet passed):**
1. GitHub Actions Prisma validation and TypeScript typecheck pass.
2. Session-authenticated HTTP grant, revoke, list, and metadata tests pass.
3. Existing patient/doctor document read, upload and download paths are audited and integrated.
4. Guardian authorization and tenant lifecycle are explicitly addressed.
5. No changes to production Neon or `main` until reviewed.


## Positive authorization and revocation — isolated DB test (2026-11-19)

A transactional SQL test used a synthetic patient, doctor B and clinic B:
1. Created an active patient-clinic association and an ACTIVE READ_RECORD grant.
2. Verified the active grant, association and doctor membership jointly yield `positive_access = true`.
3. Revoked the grant by setting `status = 'REVOKED'` and `revokedAt = now()`.
4. Verified `after_revocation_access = false`.
5. Deactivated the temporary clinic B association after the test.

The earlier attempt to create another ACTIVE grant for doctor A/clinic A was rejected by the partial unique index `MedicalAccessGrant_one_active_per_context`, because an expired-by-time grant still had database status ACTIVE. The service now transitions such a grant to EXPIRED before renewal, but **that service path has not been HTTP-tested**.

**Scope:** this verifies database predicates and constraints, not authenticated application authorization or audit persistence.
