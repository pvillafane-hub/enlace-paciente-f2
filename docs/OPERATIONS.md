# Independent environment and release gate

## Resources and configuration

Create a separate Vercel project with production branch `mejoras/assessment`. Use a
new test PostgreSQL database, a separate private S3 bucket and synthetic patients.
The build blocks this branch in either original Vercel project. Set
`ENLACE_ISOLATED_ENVIRONMENT=true` only in the new project after verifying resource
isolation and applying migrations. A preview already exists in the original project;
it is not evidence of isolated resources. No clinical operations were tested there.
Do not copy clinical records or production environment variables by default.
`NEXT_PUBLIC_APP_URL` must be the exact HTTPS origin of this independent application.
WebAuthn derives its RP ID from that configured hostname, never from a request header.
Use Stripe test credentials and its webhook secret. The reset-email adapter supports
Resend; enable it only after selecting the provider, verifying the sender domain and
setting RESEND_API_KEY / RESET_EMAIL_FROM. No email was sent during development.

## Migration rules

No database migrations have been applied during this work.

- Empty test database: apply both tracked migrations with `npm run db:migrate`.
- Existing database: inspect schema and migration history first. The baseline was
  generated from commit b434678; it must match before marking that migration applied.
  Do not execute CREATE TABLE baseline SQL over an existing database. Baseline with
  `prisma migrate resolve --applied 20261007000100_baseline` only after verification,
  then apply the additive security migration to a restored test copy first.
- Existing migrations managed elsewhere: reconcile history before using these files.
- The new rate counter, payment receipts and challenge TTL columns are required by
  this branch. Do not deploy the branch against an unmigrated database.
- The append-only audit trigger blocks row UPDATE/DELETE. It is not cryptographic
  protection against a privileged database administrator or TRUNCATE. Restrict the
  app DB role; approve retention policy before administrative archival/deletion.

## Required live acceptance tests

1. Patient A cannot approve/reject Patient B's request, even with its exact request ID.
2. Only an active DOCTOR can request access to an active PATIENT. An approved relation
   grants access; revocation immediately denies new document reads and staff access.
3. Existing email registration never recreates a revoked relation and responses contain
   no password hashes. Test concurrent creation with the same email.
4. Expired, disabled and password-revoked sessions fail on all protected routes.
5. Reset token replay and simultaneous consumption yield only one successful reset.
6. Invalid multipart, oversize files, disallowed signatures and revoked targets fail.
   Confirm temporary cleanup and S3 compensation when DB writes fail.
7. Soft-deleted documents disappear from dashboard/list/share/report paths. A signed URL
   issued before deletion can remain usable for its remaining lifetime (max 60 seconds).
8. Verify passkey enrollment/login on supported devices, expiration and replay prevention
   under multiple Vercel instances. Passkeys from the original domain will not transfer.
9. Verify the atomic rate counter under concurrency; test checkout duplicate events,
   delayed payment success, DB outage and Stripe retry delivery using test mode.
10. Exercise first-time clinic patient onboarding with a real test email; synthetic
    @enlacesalud.local accounts cannot receive recovery emails.

## Backups and restore evidence

The backup branch and Git bundle cover source code only. PostgreSQL and S3 backups
remain unverified. Agree RPO/RTO and retention before configuring them. For PostgreSQL,
verify encryption, scheduled backups/PITR, isolated credentials and restoration into a
new test database. For S3, verify Block Public Access, IAM minimum privileges, encryption,
versioning/lifecycle and recovery of both current and deleted object versions. Restore
DB and objects together and confirm document keys resolve. Record backup timestamps,
restore start/end, integrity checks and recovery gaps without patient information.
No production backup or restore has been executed by this branch.

## Logging and maintenance

Audit events contain actor, action and opaque entity IDs, without passwords, tokens,
filenames, email addresses, allergy text or document contents. Restrict Vercel log access
and define alert routing/retention. Investigate historical authentication logs before
choosing which sessions/tokens to invalidate; no historical logs were altered.
The maintenance route requires an exact Bearer CRON_SECRET and purges expired sessions,
reset tokens, QR tokens and rate counters. Configure a daily authenticated schedule in
the independent project after verifying the route. No external cron was provisioned.

## Remaining product/architecture decisions

- Organizational multi-tenancy needs a Clinic/Tenant owner and explicit policy for
  cross-clinic sharing, staff affiliation, billing and patient-owned records. No tenant
  migration was imposed on the existing patient/physician model.
- Decide historical consent review and how patients claim clinic-created accounts.
- Define malware quarantine/scanning and failure handling before real clinical uploads.
- Define email verification and recovery for passkey-only users.
- Document payment duration, refunds and subscription requirements before changing the
  existing one-time purchase behavior.
- Establish WAF/bot controls, security alert ownership, log retention and a clinical
  interpretation policy. Activity indicators are not medical risk scores.
