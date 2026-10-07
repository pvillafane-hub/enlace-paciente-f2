import { it, expect, vi, beforeEach } from 'vitest'
const mock = vi.hoisted(() => ({ session: vi.fn(), user: vi.fn(), logs: vi.fn() }))
vi.mock('@/lib/auth', () => ({ getValidatedSession: mock.session }))
vi.mock('@/lib/prisma', () => ({ prisma: { user: { findFirst: mock.user }, auditLog: { findMany: mock.logs } } }))
import { GET } from '../app/api/admin/logs/export/route'
import { csvCell } from '../src/lib/csv'
beforeEach(() => vi.resetAllMocks())
it('anonymous caller cannot export audit records', async () => {
  mock.session.mockResolvedValue(null)
  expect((await GET(new Request('http://localhost/api/admin/logs/export'))).status).toBe(401)
  expect(mock.logs).not.toHaveBeenCalled()
})
it('non-admin cannot export audit records', async () => {
  mock.session.mockResolvedValue({ userId: 'patient' }); mock.user.mockResolvedValue(null)
  expect((await GET(new Request('http://localhost/api/admin/logs/export'))).status).toBe(403)
  expect(mock.logs).not.toHaveBeenCalled()
})
it('CSV escapes quotes and neutralizes spreadsheet formulas', () => {
  expect(csvCell('a"b')).toBe('"a""b"')
  expect(csvCell('=HYPERLINK("https://example.test")')).toBe('"\'=HYPERLINK(""https://example.test"")"')
})
