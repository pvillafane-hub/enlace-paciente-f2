import { beforeEach, expect, it, vi } from 'vitest'
const m = vi.hoisted(() => ({ transaction: vi.fn(), user: vi.fn(), receipt: vi.fn(), binding: vi.fn(), event: vi.fn(), createDoc: vi.fn(), change: vi.fn(), createEvent: vi.fn(), audit: vi.fn(), lock: vi.fn() }))
vi.mock('@/lib/prisma', () => ({ prisma: { $transaction: m.transaction } }))
import { deliverSyntheticReceipt, eligibleSyntheticPatient } from '../src/lib/interop/delivery'
const patient = { id: 'p1', email: 'patient@example.test', role: 'PATIENT', active: true, identityStatus: 'CLEAR', dateOfBirth: new Date('2018-04-12'), licenses: [{ status: 'ACTIVE', validUntil: new Date('2099-01-01') }] }
const receipt = { id: 'r1', source: 'TEST-LAB', status: 'MATCHED', deliveredAt: null, reportId: 'TEST-REPORT', normalized: { patientId: 'TEST-PATIENT-001', birthDate: '2018-04-12', issued: '2026-10-28T12:00:00Z', observations: [] } }
beforeEach(() => {
  vi.resetAllMocks(); vi.stubEnv('VERCEL_ENV','preview'); vi.stubEnv('INTEROP_SANDBOX_ENABLED','true'); vi.stubEnv('ENLACE_ISOLATED_ENVIRONMENT','true'); vi.stubEnv('INTEROP_SANDBOX_TOKEN','a'.repeat(40)); vi.stubEnv('INTEROP_SANDBOX_SOURCE','TEST-LAB')
  m.user.mockResolvedValue(patient); m.receipt.mockResolvedValue(receipt); m.binding.mockResolvedValue({ userId: 'p1' }); m.event.mockResolvedValue({ id: 'e1' }); m.createDoc.mockResolvedValue({ id: 'd1' }); m.change.mockResolvedValue({ count: 1 })
  m.transaction.mockImplementation(fn => fn({ user: { findFirst: vi.fn().mockResolvedValue({ id: 'admin' }), findUnique: m.user }, interopSandboxReceipt: { findFirst: m.receipt, updateMany: m.change }, interopSandboxPatient: { findUnique: m.binding }, interopSandboxEvent: { findFirst: m.event, create: m.createEvent }, document: { create: m.createDoc }, auditLog: { create: m.audit }, $queryRaw: m.lock }))
})
it('rejects clinical identities and different birth dates', () => {
  expect(eligibleSyntheticPatient(patient)).toBe(true)
  for (const changes of [{ email: 'patient@real.com' }, { dateOfBirth: new Date('2018-04-13') }, { role: 'DOCTOR' }, { active: false }, { identityStatus: 'HOLD' }]) expect(eligibleSyntheticPatient({ ...patient, ...changes })).toBe(false)
})
it('blocks production without touching the database', async () => {
  vi.stubEnv('VERCEL_ENV','production')
  await expect(deliverSyntheticReceipt('admin','r1',false)).rejects.toThrow('Disabled'); expect(m.transaction).not.toHaveBeenCalled()
})
it('blocks pending, rejected and already delivered receipts', async () => {
  for (const changes of [{ status: 'PENDING_REVIEW' }, { status: 'REJECTED' }, { deliveredAt: new Date() }]) {
    m.receipt.mockResolvedValueOnce({ ...receipt, ...changes })
    await expect(deliverSyntheticReceipt('admin','r1',false)).rejects.toThrow()
  }
  expect(m.createDoc).not.toHaveBeenCalled()
})
it('requires verified manual identity, a binding and an active patient license', async () => {
  m.receipt.mockResolvedValueOnce({ ...receipt, status: 'MANUALLY_MATCHED' }); m.event.mockResolvedValueOnce(null)
  await expect(deliverSyntheticReceipt('admin','r1',false)).rejects.toThrow('Missing review')
  m.binding.mockResolvedValueOnce(null)
  await expect(deliverSyntheticReceipt('admin','r1',false)).rejects.toThrow('Missing binding')
  m.user.mockResolvedValueOnce({ ...patient, licenses: [] })
  await expect(deliverSyntheticReceipt('admin','r1',false)).rejects.toThrow('unlicensed')
  expect(m.createDoc).not.toHaveBeenCalled()
})
it('creates a private document and records the delivery without rewriting the input', async () => {
  await expect(deliverSyntheticReceipt('admin','r1',false)).resolves.toBe('d1')
  expect(m.createDoc).toHaveBeenCalledWith({ data: expect.objectContaining({ userId: 'p1', filePath: 'interop-sandbox:r1', proxyVisible: false }) })
  expect(m.change).toHaveBeenCalledWith({ where: { id: 'r1', source: 'TEST-LAB', status: 'MATCHED', deliveredAt: null }, data: { deliveredAt: expect.any(Date), deliveredDocumentId: 'd1' } })
  expect(m.createEvent).toHaveBeenCalledWith({ data: expect.objectContaining({ action: 'DELIVERED_TO_SYNTHETIC_RECORD', actorId: 'admin' }) })
})
it('fails the whole transaction on a concurrent delivery and requires explicit proxy visibility', async () => {
  m.change.mockResolvedValueOnce({ count: 0 })
  await expect(deliverSyntheticReceipt('admin','r1',true)).rejects.toThrow('Concurrent delivery')
  expect(m.createDoc).toHaveBeenCalledWith({ data: expect.objectContaining({ proxyVisible: true }) }); expect(m.createEvent).not.toHaveBeenCalled()
})
