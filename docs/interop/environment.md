# Isolated interoperability environment

Provisioned 2026-10-28 for synthetic data only.

- Vercel project: enlace-interop-sandbox
- Vercel project ID: prj_OZQyTup16aGA8sz9gEIWt17uBTVv
- Neon project: enlace-interop-sandbox (weathered-pond-30843228)
- Neon branch: synthetic-tests (br-plain-scene-b8jla7br)
- Database: interop_sandbox
- Git branch for preview: mejoras/interop-sandbox

Preview-only variables: DATABASE_URL, DATABASE_URL_UNPOOLED,
ENLACE_ISOLATED_ENVIRONMENT, INTEROP_SANDBOX_ENABLED, INTEROP_SANDBOX_SOURCE,
INTEROP_SANDBOX_TOKEN. Keep their values outside Git. No production credentials
or clinical rows are copied. The production reception guard remains in place.

The original connection from this executor could not resolve the PostgreSQL
hostname. Migration SQL from the repository was therefore applied through the
Neon database connector in transactions. The existing interoperability migration
was applied first; the remaining baseline migrations were then applied and all
six source checksums recorded in _prisma_migrations in the isolated database.
Clinical tables were created empty. Initial synthetic receipts/events were
inserted for storage validation. They do not prove HTTP intake has been tested.

The additive schema-check script recognizes this one additional Vercel project
ID. It still requires the explicit isolation flag and unpooled URL; original
project protections are retained. No schema updates are permitted by project
name alone.
