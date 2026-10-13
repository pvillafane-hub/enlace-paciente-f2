import { beforeEach, expect, it, vi } from 'vitest'
const m = vi.hoisted(() => ({ admin: vi.fn(), transaction: vi.fn(), user: vi.fn(), find: vi.fn(), create: vi.fn(), change: vi.fn(), audit: vi.fn() }))
vi.mock('@/lib/admin-session', () => ({ requireActiveAdmin: m.admin }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/prisma', () => ({ prisma: { $transaction: m.transaction } }))
import { createPendingLink, reviewGuardian } from '../app/dashboard/admin/guardians/actions'
const updatedAt = new Date('2026-10-13T12:00:00Z')
const link = { id: 'link', guardianId: 'adult', patientId: 'minor', status: 'PENDING', canUpload: false, validUntil: null, updatedAt, guardian: { role: 'PATIENT', active: true }, patient: { role: 'PATIENT', active: true } }
function form(overrides: Record<string,string> = {}) { const f = new FormData(); for (const [k,v] of Object.entries({ guardianEmail: 'adult@example.test', patientId: 'minor', relationship: 'MADRE', status: 'ACTIVE', authorityVerified: 'on', minorVerified: 'on', validUntil: '2030-01-01', reason: 'Autoridad verificada por la clínica', ...overrides })) f.set(k,v); return f }
beforeEach(() => {
  vi.resetAllMocks(); m.admin.mockResolvedValue({ id: 'admin' }); m.user.mockResolvedValueOnce({ id: 'adult' }).mockResolvedValue({ id: 'minor' }); m.find.mockResolvedValue(link); m.change.mockResolvedValue({ count: 1 }); m.create.mockResolvedValue({ id: 'new' })
  m.transaction.mockImplementation(async fn => fn({ user: { findFirst: m.user }, guardianLink: { findUnique: m.find, create: m.create, updateMany: m.change }, auditLog: { create: m.audit } }))
})
it('without admin authority no approval or request can execute', async () => {
  m.admin.mockRejectedValue(new Error('Unauthorized')); await expect(reviewGuardian('link', updatedAt.toISOString(), {}, form())).rejects.toThrow(); await expect(createPendingLink({}, form())).rejects.toThrow(); expect(m.transaction).not.toHaveBeenCalled()
})
it('creating a relationship only creates pending access, never an active grant', async () => {
  m.find.mockResolvedValue(null); expect((await createPendingLink({}, form())).success).toBeTruthy(); expect(m.create).toHaveBeenCalledWith({ data: { guardianId: 'adult', patientId: 'minor', relationship: 'MADRE', requestedById: 'admin' } })
})
it('approved scope and verification are audited with the actual admin', async () => {
  expect((await reviewGuardian('link', updatedAt.toISOString(), {}, form())).success).toBeTruthy()
  expect(m.change).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'link', updatedAt }, data: expect.objectContaining({ status: 'ACTIVE', canUpload: false, reviewedById: 'admin', validUntil: expect.any(Date) }) }))
  expect(m.audit).toHaveBeenCalledWith({ data: expect.objectContaining({ userId: 'admin', action: 'GUARDIAN_LINK_APPROVED', metadata: expect.objectContaining({ guardianId: 'adult', patientId: 'minor', before: expect.objectContaining({ status: 'PENDING' }), after: expect.objectContaining({ status: 'ACTIVE', canUpload: false }) }) }) })
})
it('stale approval and disabled accounts cannot grant access', async () => {
  expect((await reviewGuardian('link', 'stale', {}, form())).error).toBeTruthy(); expect(m.change).not.toHaveBeenCalled()
  m.find.mockResolvedValue({ ...link, patient: { role: 'PATIENT', active: false } }); expect((await reviewGuardian('link', updatedAt.toISOString(), {}, form())).error).toBeTruthy(); expect(m.change).not.toHaveBeenCalled()
})
it('revocation removes permissions and records a reason without deleting either account', async () => {
  expect((await reviewGuardian('link', updatedAt.toISOString(), {}, form({ status: 'REVOKED', authorityVerified: '', minorVerified: '' }))).success).toBeTruthy()
  expect(m.change).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'REVOKED', canUpload: false, validUntil: null }) })); expect(m.audit).toHaveBeenCalledWith({ data: expect.objectContaining({ action: 'GUARDIAN_LINK_REVOKED' }) })
})
