// A branch preview in the original project is not an isolated environment.
if (process.env.VERCEL && process.env.VERCEL_GIT_COMMIT_REF?.startsWith('mejoras/')) {
  if (process.env.ENLACE_ISOLATED_ENVIRONMENT !== 'true' || process.env.VERCEL_PROJECT_ID === 'prj_MLGdV90oRBYS30eJ83yWkAOLSOQC' || process.env.VERCEL_PROJECT_ID === 'prj_Jp1Wl6zlHFnedao4TQKPE8p0EE9t') {
    console.error('Deployment blocked: use a separate Vercel project with migrated test PostgreSQL and private test S3; then set ENLACE_ISOLATED_ENVIRONMENT=true there.');
    process.exit(1);
  }
}
