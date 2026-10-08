import { beforeEach, expect, it, vi } from 'vitest'
const m = vi.hoisted(() => ({ session: vi.fn(), admin: vi.fn(), transaction: vi.fn(), user: vi.fn(), update: vi.fn(), assignments: vi.fn(), clearAssignments: vi.fn(), upsert: vi.fn(), revoke: vi.fn(), audit: vi.fn() }))
vi.mock('@/lib/auth', () => ({ getValidatedSession: m.session }))
vi.mock('next/navigation', () => ({ redirect: () => { throw new Error('redirect') } }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/prisma', () => ({ prisma: { user: { findUnique: m.admin }, $transaction: m.transaction } }))
import { toggleUserActive, changeUserRole, assignUserAsStaff } from '../app/dashboard/admin/users/actions'
beforeEach(() => {
  vi.resetAllMocks()
  m.session.mockResolvedValue({ userId: 'admin' })
  m.admin.mockResolvedValue({ id: 'admin', active: true, role: 'ADMIN' })
  m.user.mockResolvedValue({ id: 'target', role: 'PATIENT', active: true })
  m.assignments.mockResolvedValue([{ doctorId: 'old-doctor' }])
  m.revoke.mockResolvedValue({ count: 2 })
  m.transaction.mockImplementation(async fn => fn({ user: { findUnique: m.user, update: m.update }, clinicStaff: { findMany: m.assignments, updateMany: m.clearAssignments, upsert: m.upsert }, session: { deleteMany: m.revoke }, auditLog: { create: m.audit } }))
})
it('non-admin cannot mutate users', async () => {
  m.admin.mockResolvedValue({ role: 'PATIENT', active: true })
  await expect(changeUserRole('target', 'DOCTOR')).rejects.toThrow()
  expect(m.transaction).not.toHaveBeenCalled()
})
it('administrator target remains protected', async () => {
  m.user.mockResolvedValue({ id: 'target', role: 'ADMIN', active: true })
  await expect(toggleUserActive('target', true)).rejects.toThrow()
  expect(m.update).not.toHaveBeenCalled()
})
it('stale activation submission cannot invert an already changed state', async () => {
  m.user.mockResolvedValue({ id: 'target', role: 'PATIENT', active: false })
  await expect(toggleUserActive('target', true)).rejects.toThrow()
  expect(m.update).not.toHaveBeenCalled()
})
it('role audit captures actor, target, before/after and revoked sessions', async () => {
  await changeUserRole('target', 'DOCTOR')
  expect(m.audit).toHaveBeenCalledWith({ data: expect.objectContaining({ userId: 'admin', entityId: 'target', metadata: { version: 1, before: { role: 'PATIENT', active: true, staffDoctorIds: ['old-doctor'] }, after: { role: 'DOCTOR', active: true, staffDoctorIds: [] }, revokedSessions: 2 } }) })
})
it('staff audit captures the old assignment and selected doctor', async () => {
  m.user.mockResolvedValueOnce({ id: 'target', role: 'STAFF', active: false }).mockResolvedValueOnce({ id: 'new-doctor', role: 'DOCTOR', active: true })
  const form = new FormData(); form.set('doctorId', 'new-doctor')
  await assignUserAsStaff('target', form)
  expect(m.audit).toHaveBeenCalledWith({ data: expect.objectContaining({ action: 'USER_STAFF_ASSIGNED', metadata: { version: 1, before: { role: 'STAFF', active: false, staffDoctorIds: ['old-doctor'] }, after: { role: 'STAFF', active: true, staffDoctorIds: ['new-doctor'] }, revokedSessions: 2 } }) })
})
