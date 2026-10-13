import { beforeEach, expect, it, vi } from 'vitest'
import { guardianDecision } from '../src/lib/guardian-policy'
const m = vi.hoisted(() => ({ canRead: vi.fn(), link: vi.fn() }))
vi.mock('@/lib/access', () => ({ canReadPatient: m.canRead }))
vi.mock('@/lib/prisma', () => ({ prisma: { guardianLink: { findFirst: m.link } } }))
import { activeGuardian, canReadDocument, canUploadPatient } from '../src/lib/guardian-access'
const actor = { id: 'parent', role: 'PATIENT' as const, active: true }
const document = { userId: 'child', proxyVisible: false, deletedAt: null }
beforeEach(() => { vi.resetAllMocks(); m.canRead.mockResolvedValue(false); m.link.mockResolvedValue(null) })
it('no actor can infer guardian access from patient identity alone', async () => {
  expect(await canReadDocument(actor, { ...document, proxyVisible: true })).toBe(false)
  expect(m.link).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ guardianId: 'parent', patientId: 'child', status: 'ACTIVE', validUntil: { gt: expect.any(Date) }, patient: { active: true, role: 'PATIENT' }, guardian: { active: true, role: 'PATIENT' } }) }))
})
it('even an approved representative cannot read a document not marked shareable', async () => {
  m.link.mockResolvedValue({ id: 'approved', canUpload: true }); expect(await canReadDocument(actor, document)).toBe(false); expect(m.link).not.toHaveBeenCalled()
})
it('approved representative can read only marked documents and cannot upload without the specific permission', async () => {
  m.link.mockResolvedValue({ id: 'approved', canUpload: false }); expect(await canReadDocument(actor, { ...document, proxyVisible: true })).toBe(true); expect(await canUploadPatient(actor, 'child')).toBe(false)
  m.link.mockResolvedValue({ id: 'approved', canUpload: true }); expect(await canUploadPatient(actor, 'child')).toBe(true)
})
it('deleted documents and inactive accounts are denied', async () => {
  expect(await canReadDocument(actor, { ...document, proxyVisible: true, deletedAt: new Date() })).toBe(false)
  expect(await activeGuardian({ ...actor, active: false }, 'child')).toBeNull(); expect(m.link).not.toHaveBeenCalled()
})
it('authorized physician or document owner retains ordinary access', async () => {
  m.canRead.mockResolvedValue(true); expect(await canReadDocument(actor, document)).toBe(true); expect(m.link).not.toHaveBeenCalled()
})
function form(values: Partial<Record<string,string>> = {}) {
  const f = new FormData(); for (const [key,value] of Object.entries({ status: 'ACTIVE', authorityVerified: 'on', minorVerified: 'on', validUntil: '2030-01-01', reason: 'Verificación documentada por la clínica', ...values })) { if (typeof value === 'string') f.set(key,value) }; return f
}
it.each([{ authorityVerified: '' }, { minorVerified: '' }, { validUntil: '2020-01-01' }, { validUntil: '2030-02-30' }, { reason: '' }])('unverified approval cannot expand access: %j', values => { expect(() => guardianDecision(form(values))).toThrow() })
it('approval defaults to read-only and revocation removes upload scope', () => {
  expect(guardianDecision(form()).canUpload).toBe(false)
  expect(guardianDecision(form({ status: 'REVOKED', authorityVerified: '', minorVerified: '', canUpload: 'on' }))).toEqual(expect.objectContaining({ status: 'REVOKED', canUpload: false, validUntil: null }))
})
