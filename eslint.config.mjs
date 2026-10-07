import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTypescript from 'eslint-config-next/typescript'
export default [
  ...nextVitals,
  ...nextTypescript,
  { rules: { '@typescript-eslint/no-explicit-any': 'warn' } },
  { files: ['app/dashboard/page.tsx', 'app/dashboard/patients/page.tsx', 'app/dashboard/reports/page.tsx', 'app/dashboard/admin/alerts/page.tsx'], rules: { 'react-hooks/purity': 'off' } },
  { ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts'] },
]
