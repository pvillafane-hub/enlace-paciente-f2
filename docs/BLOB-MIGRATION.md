# Private Blob storage — independent test environment

This branch now uses Vercel Blob exclusively. AWS SDKs and S3 environment variables
were removed. This does not migrate, delete or recover anything from the suspended
AWS account. Existing production and backup branches retain the original S3 code.

Store `enlace-salud-mejoras-blob` (`store_MU8XNgWVBpZsPJzt`) was created PRIVATE in
IAD1 and connected to the independent project. Let the SDK use BLOB_STORE_ID and
Vercel OIDC; no static read-write token was provisioned. Local development needs
authorized Vercel environment access or its own test-only token.

Uploads retain UUID paths, content validation, size limits and compensating object
deletion on database failure. Authenticated document reads and bearer share-link
reads stream through application routes with no-store. Every request rechecks
authorization/expiry/deletion; no public Blob URL or signed redirect is returned.
An already-running download cannot be recalled after authorization changes.

Old S3 keys are deliberately rejected; migrate historical objects separately only
after AWS access is recovered and database/object integrity is verified. Do not
point this branch at the production database.

OPERATIONS.md's S3 provisioning/signed-URL instructions are superseded for this
branch: use private Blob, verify denied anonymous reads, expiry/revocation, upload
compensation and streaming in the deployed environment. Database migrations remain
required. No live document upload/download or backup restoration is yet verified.
Define an independent export/restore procedure for Blob before real clinical data.
The displayed Hobby allowance is not a production or compliance acceptance check.
