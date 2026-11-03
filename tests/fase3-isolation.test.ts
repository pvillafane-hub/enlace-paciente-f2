import { describe, expect, it } from 'vitest'
import { spawnSync } from 'node:child_process'

const project = 'prj_TTNAKJs9CbAfeoKtLeVhVxtgVJFQ'
function check(branch: string, projectId: string, isolated = 'true') {
  return spawnSync(process.execPath, ['scripts/check-isolation.mjs'], {
    env: { ...process.env, VERCEL: '1', VERCEL_GIT_COMMIT_REF: branch,
      VERCEL_PROJECT_ID: projectId, ENLACE_ISOLATED_ENVIRONMENT: isolated },
    encoding: 'utf8',
  }).status
}
describe('Fase3 deployment isolation', () => {
  for (const branch of ['Fase3', 'Fase3-interoperabilidad']) {
    it(`${branch} permits only the isolated Fase3 project`, () => {
      expect(check(branch, project)).toBe(0)
      expect(check(branch, 'prj_MLGdV90oRBYS30eJ83yWkAOLSOQC')).toBe(1)
      expect(check(branch, 'prj_OZQyTup16aGA8sz9gEIWt17uBTVv')).toBe(1)
      expect(check(branch, project, 'false')).toBe(1)
    })
  }
})
