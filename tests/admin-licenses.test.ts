import { beforeEach, expect, it, vi } from 'vitest'
const m = vi.hoisted(() => ({ session: vi.fn(), admin: vi.fn(), transaction: vi.fn(), user: vi.fn(), existing: vi.fn(), license: vi.fn(), licenses: vi.fn(), create: vi.fn(), update: vi.fn(), updateMany: vi.fn(), audit: vi.fn() }))
vi.mock('@/lib/auth', () => ({ getValidatedSession: m.session }))
vi.mock('next/navigation', () => ({ redirect: (path: string) => { throw new Error('redirect:' + path) } }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/prisma', () => ({ prisma: { user: { findUnique: m.admin }, $transaction: m.transaction } }))
import { addLicense, modifyLicense, disableLicense } from '../app/dashboard/admin/licenses/actions'
import { licenseRevision, parseLicenseForm, licenseDateInput } from '../src/lib/admin-license-policy'
import { requireActiveAdmin } from '../src/lib/admin-session'
const previous = { id: 'license', userId: 'doctor', role: 'DOCTOR', status: 'ACTIVE', plan: 'BASIC', validUntil: new Date('2030-10-12T03:59:59.999Z') }
function form(overrides: Record<string, string> = {}) {
  const data = new FormData()
  for (const [key, value] of Object.entries({ email: 'doctor@example.test', plan: 'PRO', status: 'ACTIVE', validUntil: '2035-10-12', reason: 'Cortesía aprobada', ...overrides })) data.set(key, value)
  return data
}
beforeEach(() => {
  vi.resetAllMocks()
  m.session.mockResolvedValue({ userId: 'admin' }); m.admin.mockResolvedValue({ id: 'admin', role: 'ADMIN', active: true })
  m.user.mockResolvedValue({ id: 'doctor', role: 'DOCTOR', active: true })
  m.existing.mockResolvedValue(null); m.license.mockResolvedValue(previous); m.licenses.mockResolvedValue([])
  m.create.mockImplementation(async ({ data }) => ({ id: 'new-license', ...data }))
  m.update.mockImplementation(async ({ data }) => ({ ...previous, ...data }))
  m.transaction.mockImplementation(async fn => fn({ user: { findUnique: m.user }, license: { findFirst: m.existing, findUnique: m.license, findMany: m.licenses, create: m.create, update: m.update, updateMany: m.updateMany }, auditLog: { create: m.audit } }))
})
it('anonymous session cannot create a license', async () => {
  m.session.mockResolvedValue(null)
  await expect(addLicense({}, form())).rejects.toThrow('redirect')
  expect(m.transaction).not.toHaveBeenCalled()
})
it.each([{ role: 'DOCTOR', active: true }, { role: 'ADMIN', active: false }])('only active admins can write licenses: %j', async admin => {
  m.admin.mockResolvedValue(admin)
  await expect(addLicense({}, form())).rejects.toThrow('Unauthorized')
  expect(m.transaction).not.toHaveBeenCalled()
})
it('a non-admin opening the page is redirected to their own dashboard', async () => {
  m.admin.mockResolvedValue({ role: 'PATIENT', active: true })
  await expect(requireActiveAdmin(true)).rejects.toThrow('redirect:/dashboard')
})
it('manual creation audits actor, target, reason and values without a payment record', async () => {
  expect((await addLicense({}, form())).success).toBeTruthy()
  expect(m.audit).toHaveBeenCalledWith({ data: expect.objectContaining({ userId: 'admin', entityId: 'new-license', action: 'ADMIN_LICENSE_CREATED', metadata: expect.objectContaining({ source: 'manual', reason: 'Cortesía aprobada', before: null, after: expect.objectContaining({ userId: 'doctor', plan: 'PRO', status: 'ACTIVE' }) }) }) })
})
it('a duplicate license must be modified rather than created again', async () => {
  m.existing.mockResolvedValue({ id: 'existing' })
  expect((await addLicense({}, form())).error).toContain('ya tiene una licencia')
  expect(m.create).not.toHaveBeenCalled()
})
it('cannot license staff or inactive accounts', async () => {
  m.user.mockResolvedValue({ id: 'staff', role: 'STAFF', active: true })
  expect((await addLicense({}, form())).error).toContain('Doctor o Paciente')
  expect(m.create).not.toHaveBeenCalled()
})
it('stale edits are rejected before overwriting a license', async () => {
  expect((await modifyLicense(previous.id, 'stale', {}, form())).error).toContain('cambió')
  expect(m.update).not.toHaveBeenCalled()
})
it('changing a license audits before/after and deactivates older active alternatives', async () => {
  m.licenses.mockResolvedValue([{ ...previous, id: 'older' }])
  expect((await modifyLicense(previous.id, licenseRevision(previous), {}, form())).success).toBeTruthy()
  expect(m.update).toHaveBeenCalledWith({ where: { id: 'older' }, data: { status: 'INACTIVE', validUntil: expect.any(Date) } })
  expect(m.audit).toHaveBeenCalledWith({ data: expect.objectContaining({ action: 'ADMIN_LICENSE_UPDATED', metadata: expect.objectContaining({ before: expect.objectContaining({ plan: 'BASIC' }), after: expect.objectContaining({ plan: 'PRO' }), deactivatedPreviousLicenses: [expect.objectContaining({ id: 'older' })] }) }) })
})
it('disable affects all licenses of that account without deleting documents or the account', async () => {
  m.licenses.mockResolvedValue([previous, { ...previous, id: 'older' }])
  expect((await disableLicense(previous.id, licenseRevision(previous), {}, form())).success).toBeTruthy()
  expect(m.update).toHaveBeenCalledWith({ where: { id: 'license' }, data: { status: 'INACTIVE', validUntil: expect.any(Date) } })
  expect(m.update).toHaveBeenCalledWith({ where: { id: 'older' }, data: { status: 'INACTIVE', validUntil: expect.any(Date) } })
  expect(m.audit).toHaveBeenCalledWith({ data: expect.objectContaining({ action: 'ADMIN_LICENSE_DISABLED', metadata: expect.objectContaining({ targetUserId: 'doctor', before: expect.arrayContaining([expect.objectContaining({ id: 'older' })]) }) }) })
})
it('rejects missing reasons and invalid dates before writes', async () => {
  expect((await addLicense({}, form({ reason: '' }))).error).toBeTruthy()
  expect((await addLicense({}, form({ validUntil: '2030-02-30' }))).error).toBeTruthy()
  expect(m.transaction).not.toHaveBeenCalled()
})
it('expiry uses the end of the selected Puerto Rico day', () => {
  const input = parseLicenseForm(form({ validUntil: '2030-10-12' }), new Date('2026-10-12T00:00:00Z'))
  expect(input.validUntil?.toISOString()).toBe('2030-10-13T03:59:59.999Z')
  expect(licenseDateInput(input.validUntil)).toBe('2030-10-12')
})
it('permanent expiry requires an explicit checkbox', () => {
  expect(parseLicenseForm(form({ unlimited: 'on', validUntil: '' })).validUntil).toBeNull()
  expect(() => parseLicenseForm(form({ validUntil: '' }))).toThrow()
})
