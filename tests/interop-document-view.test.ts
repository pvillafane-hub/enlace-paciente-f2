import { beforeEach, expect, it, vi } from 'vitest'
const m = vi.hoisted(() => ({ session: vi.fn(), license: vi.fn(), access: vi.fn(), doc: vi.fn(), text: vi.fn(), audit: vi.fn(), storage: vi.fn() }))
vi.mock('@/lib/api-auth', () => ({ getApiSession: m.session }))
vi.mock('@/lib/license-access', () => ({ getLicenseAccess: m.license }))
vi.mock('@/lib/guardian-access', () => ({ canReadDocument: m.access }))
vi.mock('@/lib/prisma', () => ({ prisma: { document: { findUnique: m.doc } } }))
vi.mock('@/lib/interop/delivery', () => ({ syntheticDocumentText: m.text }))
vi.mock('@/lib/audit', () => ({ auditLog: m.audit }))
vi.mock('@/lib/document-storage', () => ({ readDocument: m.storage }))
import handler from '../pages/api/documents/view'
beforeEach(() => {
  vi.resetAllMocks()
  m.session.mockResolvedValue({ userId: 'viewer', user: { id: 'viewer' }, expiresAt: new Date('2099-01-01') })
  m.license.mockResolvedValue({ active: true }); m.access.mockResolvedValue(true)
  m.doc.mockResolvedValue({ id: 'd1', userId: 'patient', deletedAt: null, filePath: 'interop-sandbox:r1' }); m.text.mockResolvedValue('SOLO PRUEBAS')
})
async function request() {
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis(), send: vi.fn().mockReturnThis(), setHeader: vi.fn() }
  await handler({ method: 'GET', cookies: { pp_session: 's1' }, query: { id: 'd1' } } as never,res as never)
  return res
}
it('enforces session, license and document authorization before reading a synthetic result', async () => {
  m.session.mockResolvedValueOnce(null); expect((await request()).status).toHaveBeenCalledWith(401)
  m.license.mockResolvedValueOnce({ active: false }); expect((await request()).status).toHaveBeenCalledWith(403)
  m.access.mockResolvedValueOnce(false); expect((await request()).status).toHaveBeenCalledWith(403)
  expect(m.text).not.toHaveBeenCalled(); expect(m.storage).not.toHaveBeenCalled()
})
it('returns text only to authorized viewers, with no caching or object-storage access', async () => {
  const res = await request()
  expect(res.send).toHaveBeenCalledWith(expect.stringContaining('name="viewport"')); expect(res.setHeader).toHaveBeenCalledWith('Content-Type','text/html; charset=utf-8')
  expect(res.setHeader).toHaveBeenCalledWith('Cache-Control','private, no-store'); expect(m.storage).not.toHaveBeenCalled()
  expect(m.audit).toHaveBeenCalledWith({ userId: 'viewer', action: 'DOCUMENT_VIEW', entityId: 'd1' })
})
it('does not fall back to storage for an unavailable or disabled synthetic result', async () => {
  m.text.mockResolvedValue(null)
  expect((await request()).status).toHaveBeenCalledWith(404); expect(m.storage).not.toHaveBeenCalled()
})
