import { PrismaClient } from '@prisma/client';
import { execFileSync } from 'node:child_process';
// Local compilation does not mutate a database. Only this named isolated project may run the additive release migration.
if (process.env.VERCEL) {
  if (process.env.VERCEL_PROJECT_ID !== 'prj_E14yVB1Az8RWvAmpkQ9hO0Z1ESJC' || process.env.ENLACE_ISOLATED_ENVIRONMENT !== 'true' || !process.env.DATABASE_URL_UNPOOLED) {
    console.error('GUARDIAN_MIGRATION_BLOCKED: isolated mejoras project and direct database connection required');
    process.exit(1);
  }
  const client = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL_UNPOOLED } } });
  try {
    const rows = await client.$queryRaw`SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='GuardianLink') AS links, EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='Document' AND column_name='proxyVisible') AS documents, EXISTS (SELECT 1 FROM "_prisma_migrations" WHERE migration_name='20261015150000_identity_review' AND finished_at IS NOT NULL AND rolled_back_at IS NULL) AS applied`;
    if (!rows[0]?.links || !rows[0]?.documents || !rows[0]?.applied) {
      execFileSync(process.execPath, ['scripts/migrate-isolated.mjs'], { stdio: 'pipe' });
      console.log('GUARDIAN_ADDITIVE_MIGRATION_APPLIED');
    } else console.log('GUARDIAN_SCHEMA_ALREADY_PRESENT');
  } catch {
    console.error('GUARDIAN_MIGRATION_FAILED: deployment stopped; inspect migration state');
    process.exitCode = 1;
  } finally { await client.$disconnect(); }
}
