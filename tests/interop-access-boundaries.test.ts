import { beforeEach, expect, it, vi } from 'vitest'
const m = vi.hoisted(() => ({ session: vi.fn(), user: vi.fn(), licenses: vi.fn(), guardian: vi.fn(), doctor: vi.fn(), doc: vi.fn(), text: vi.fn(), audit: vi.fn(), storage: vi.fn() }))
vi.mock('@/lib/api-auth', () => ({ getApiSession: m.session }))
vi.mock('@/lib/prisma', () => ({ prisma: { user: { findFirst: m.user, findUnique: m.user }, license: { findMany: m.licenses }, guardianLink: { findFirst: m.guardian }, doctorPatient: { findUnique: m.doctor }, document: { findUnique: m.doc } } }))
vi.mock('@/lib/interop/delivery', () => ({ syntheticDocumentText: m.text }))
vi.mock('@/lib/audit', () => ({ auditLog: m.audit }))
vi.mock('@/lib/document-storage', () => ({ readDocument: m.storage }))
import handler from '../pages/api/documents/view'
const guardian = { id: 'guardian', role: 'PATIENT', active: true }
beforeEach(() => {
  vi.resetAllMocks()
  m.session.mockResolvedValue({ userId: guardian.id, user: guardian, expiresAt: new Date('2099-01-01') })
  m.user.mockImplementation(({where}: {where: {id: string}}) => Promise.resolve(where.id === guardian.id ? guardian : { id: 'child', role: 'PATIENT', active: true }))
  m.licenses.mockResolvedValue([{ status: 'ACTIVE', validUntil: new Date('2099-01-01') }])
  m.guardian.mockResolvedValue({ id: 'link', canUpload: false })
  m.doc.mockResolvedValue({ id: 'doc', userId: 'child', proxyVisible: true, deletedAt: null, filePath: 'interop-sandbox:receipt' })
  m.text.mockResolvedValue('SOLO PRUEBAS\nPaciente ficticio: TestUser\n\n718-7: 12.4 g/dL')
})
async function request() {
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis(), send: vi.fn().mockReturnThis(), setHeader: vi.fn() }
  await handler({ method: 'GET', cookies: { pp_session: 'synthetic-session' }, query: { id: 'doc' } } as never, res as never)
  return res
}
it('allows the authorized representative through the real license and guardian checks', async () => {
  const res = await request()
  expect(res.status).toHaveBeenCalledWith(200)
  expect(res.send).toHaveBeenCalledWith(expect.stringContaining('<strong>12.4 g/dL</strong>'))
  expect(m.guardian).toHaveBeenCalledWith(expect.objectContaining({where: expect.objectContaining({guardianId: 'guardian', patientId: 'child', status: 'ACTIVE', validUntil: {gt: expect.any(Date)}})}))
  expect(res.setHeader).toHaveBeenCalledWith('Content-Security-Policy', expect.stringContaining("default-src 'none'"))
})
it.each(['PENDING', 'REVOKED', 'EXPIRED', 'MISSING'])('denies a %s guardian link before rendering', async () => {
  // The database returns no row for links outside the ACTIVE + future-validity predicate.
  m.guardian.mockResolvedValue(null)
  expect((await request()).status).toHaveBeenCalledWith(403)
  expect(m.text).not.toHaveBeenCalled(); expect(m.storage).not.toHaveBeenCalled()
})
it('denies a private document even with an approved guardian link', async () => {
  m.doc.mockResolvedValue({ id: 'doc', userId: 'child', proxyVisible: false, deletedAt: null, filePath: 'interop-sandbox:receipt' })
  expect((await request()).status).toHaveBeenCalledWith(403)
  expect(m.guardian).not.toHaveBeenCalled(); expect(m.text).not.toHaveBeenCalled()
})
it('denies an expired representative license before fetching the document', async () => {
  m.licenses.mockResolvedValue([{ status: 'ACTIVE', validUntil: new Date('2020-01-01') }])
  expect((await request()).status).toHaveBeenCalledWith(403)
  expect(m.doc).not.toHaveBeenCalled(); expect(m.text).not.toHaveBeenCalled()
})
