# Dependency security maintenance — 2026-10-28

Next.js upgraded from 16.4.0 to exact 16.4.3; eslint-config-next aligned to
16.4.3. sharp resolves to 0.35.5. This addresses the October 14 Next.js security
release affecting SVG optimization, Cache Components typed arrays and App Router
Server Actions. Source: https://nextjs.org/blog/nextjs-security-update-october-14-2026

Compatible dependency updates were applied without npm audit fix --force. The
lockfile now includes undici 6.29.1, Vitest 4.1.12 and postcss-selector-parser 6.1.5.

@vercel/cli-config 0.3.x pins vulnerable zod 4.1.11, including 0.3.4 checked during
this review. A scoped override selects zod 4.6.7 within the same major. Remove this
override when the upstream dependency resolves a safe version without it. Check
both package manifests and the lockfile when updating. Do not downgrade Blob via
npm audit fix --force just to make the advisory disappear.

Validation:
- npm audit: 0 known advisories at the time of execution (initially 9).
- npm test: 196 Vitest tests plus 6 Node session tests passed.
- npm run build -- --webpack: production compilation, TypeScript and page
  generation passed; the Next.js security warning is absent.
- Vercel config module imports and empty config validation via both
  globalConfigSchema and authConfigSchema passed with the override.
- No database migrations or application environment changes were performed.

Scope: source code in mejoras/interop-sandbox. This does not patch an already
running deployment; it must be deployed to update the hosted application. Zero
npm advisories is not a security certification or a full application assessment.
