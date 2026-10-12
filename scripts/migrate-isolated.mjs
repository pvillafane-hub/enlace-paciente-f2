import './check-isolation.mjs';
import { execFileSync } from 'node:child_process';

// Deliberate one-off release step, never part of the normal build command.
if (process.env.ENLACE_ISOLATED_ENVIRONMENT !== 'true' || !process.env.VERCEL || !process.env.DATABASE_URL_UNPOOLED) {
  console.error('Migration blocked: an isolated Vercel environment and direct database connection are required.');
  process.exit(1);
}
try {
  execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy'], {
    env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL_UNPOOLED },
    stdio: 'pipe',
  });
  console.log('ISOLATED_MIGRATIONS_APPLIED');
} catch {
  console.error('Isolated migration failed; deployment stopped. Inspect migration state before retrying.');
  process.exit(1);
}
