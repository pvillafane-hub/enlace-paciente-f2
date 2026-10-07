# Enlace Salud — isolated improvement branch

Next.js / React / TypeScript patient portal, PostgreSQL + Prisma, private S3 objects,
custom database sessions and WebAuthn passkeys. Stripe handles one-time PRO payments.

The original code is preserved at `backup/assessment-b434678`. Work lives in
`mejoras/assessment`; do not promote it to production until isolated integration tests pass.

## Local checks

Use Node 24 and run `npm ci`, `npm run typecheck`, `npm test`, `npm run lint`,
then `npm run build`. These checks do not need production secrets.

## Environment and migrations

Copy `.env.example` to a local environment file and supply only test resources.
Link the independent Vercel project and verify environment keys before starting
an app server or applying migrations. Never use production DATABASE_URL or a
production bucket to test this branch. See `docs/OPERATIONS.md` for baseline rules,
backup/restore validation, email setup and remaining operational work.

## Security behavior

Existing patients approve medical access themselves; clinic-created new accounts
are linked only when first created. Patient relationships are not organization tenants.
All medical document routes check active accounts and relationships. Soft-deleted
documents and their share links cannot be read; already-issued S3 URLs can remain
valid for up to 60 seconds. Share links expire after at most 7 days.

Passwords use bcrypt with a shared strength policy and a 72-byte maximum.
A password change requires the old password and revokes existing sessions.
Reset tokens are indexed SHA-256 hashes, atomically consumed, and never logged.
Old bcrypt-hashed recovery tokens from the original application are not accepted;
request a fresh email. Passkey registration and login require user verification and
five-minute single-use challenges. Each independent hostname requires its own passkeys.

Uploads accept PDF/JPEG/PNG/WebP signatures up to 4 MB, use random S3 keys,
request SSE-S3 encryption, clean temporary files and compensate storage on DB failure.
Signature checks are not antivirus or a full file decoder; production malware scanning
and bucket controls must be verified separately.

PRO checkout remains a one-time USD 100 purchase, as in the original code. Paid events
are deduplicated by checkout ID. This does not introduce a subscription or a refund policy.

## Tests and limits

Automated tests exercise authorization and recovery decisions with mocked DB clients,
plus real Stripe signature verification using synthetic secrets. They do not prove live
PostgreSQL concurrency, actual S3 encryption or browser/device WebAuthn behavior.
