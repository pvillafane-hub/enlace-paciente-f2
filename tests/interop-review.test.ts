import { beforeEach, expect, it, vi } from 'vitest'
const m = vi.hoisted(() => ({ admin: vi.fn(), transaction: vi.fn(), actor: vi.fn(), update: vi.fn(), event: vi.fn(), refresh: vi.fn() }))
vi.mock('@/lib/admin-session', () => ({ requireActiveAdmin: m.admin }))
vi.mock('@/lib/prisma', () => ({ prisma: { $transaction: m.transaction } }))
vi.mock('next/cache', () => ({ revalidatePath: m.refresh }))
import { reviewInterop } from '../app/dashboard/admin/interoperability/actions'
function form(decision = 'MANUALLY_MATCHED') {
  const data = new FormData()
  Object.entries({ decision, reason: 'Validado con laboratorio ficticio, referencia TEST-123.', confirmed: 'on', patientId: 'TEST-PATIENT-001' }).forEach(([k,v]) => data.set(k,v))
  return data
}
beforeEach(() => {
  vi.resetAllMocks()
  vi.stubEnv('INTEROP_SANDBOX_ENABLED', 'true'); vi.stubEnv('ENLACE_ISOLATED_ENVIRONMENT', 'true'); vi.stubEnv('VERCEL_ENV', 'preview')
  vi.stubEnv('INTEROP_SANDBOX_TOKEN', 'a'.repeat(40)); vi.stubEnv('INTEROP_SANDBOX_SOURCE', 'TEST-LAB')
  m.admin.mockResolvedValue({ id: 'admin' }); m.actor.mockResolvedValue({ id: 'admin' }); m.update.mockResolvedValue({ count: 1 }); m.event.mockResolvedValue({})
  m.transaction.mockImplementation(fn => fn({ user: { findFirst: m.actor }, interopSandboxReceipt: { updateMany: m.update }, interopSandboxEvent: { create: m.event } }))
})
it('blocks unauthenticated callers and production before any writes', async () => {
  m.admin.mockRejectedValueOnce(new Error('Unauthorized'))
  await expect(reviewInterop('r1', {}, form())).rejects.toThrow('Unauthorized')
  vi.stubEnv('VERCEL_ENV', 'production')
  expect((await reviewInterop('r1', {}, form())).error).toBeTruthy()
  expect(m.transaction).not.toHaveBeenCalled()
})
it('requires a reason, confirmation and a strictly synthetic target', async () => {
  for (const [key,value] of [['reason','short'], ['confirmed',''], ['patientId','real-patient'], ['decision','MATCHED']]) {
    const data = form(); data.set(key,value)
    expect((await reviewInterop('r1', {}, data)).error).toBeTruthy()
  }
  expect(m.transaction).not.toHaveBeenCalled()
})
it('scopes the transition to pending receipts and records actor, target and reason atomically', async () => {
  expect((await reviewInterop('r1', {}, form())).success).toBeTruthy()
  expect(m.update).toHaveBeenCalledWith({ where: { id: 'r1', source: 'TEST-LAB', status: 'PENDING_REVIEW' }, data: { status: 'MANUALLY_MATCHED' } })
  expect(m.event).toHaveBeenCalledWith({ data: expect.objectContaining({ actorId: 'admin', patientId: 'TEST-PATIENT-001', action: 'IDENTITY_CONFIRMED_MANUALLY', reason: expect.stringContaining('TEST-123') }) })
})
it('rejects without assigning an identity and refuses stale or foreign-source decisions', async () => {
  await reviewInterop('r1', {}, form('REJECTED'))
  expect(m.event).toHaveBeenCalledWith({ data: expect.objectContaining({ action: 'IDENTITY_REJECTED', patientId: null }) })
  m.event.mockClear(); m.update.mockResolvedValue({ count: 0 })
  expect((await reviewInterop('r1', {}, form())).error).toContain('ya fue revisado')
  expect(m.event).not.toHaveBeenCalled()
})
it('rechecks the active admin and never reports success when audit persistence fails', async () => {
  m.actor.mockResolvedValueOnce(null)
  expect((await reviewInterop('r1', {}, form())).error).toBeTruthy(); expect(m.update).not.toHaveBeenCalled()
  m.event.mockRejectedValue(new Error('private-db-detail'))
  const result = await reviewInterop('r1', {}, form())
  expect(result.error).toBeTruthy(); expect(result.error).not.toContain('private-db-detail'); expect(m.refresh).not.toHaveBeenCalled()
})
