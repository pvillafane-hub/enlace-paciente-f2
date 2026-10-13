import { beforeEach, expect, it, vi } from 'vitest'
import { licenseAccess } from '../src/lib/license-policy'
const m = vi.hoisted(() => ({ entitlement: vi.fn(), session: vi.fn(), read: vi.fn(), parse: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), transaction: vi.fn() }))
vi.mock('@/lib/license-access', () => ({ getLicenseAccess: m.entitlement }))
vi.mock('@/lib/api-auth', () => ({ getApiSession: m.session }))
vi.mock('@/lib/prisma', () => ({ prisma: { document: { findMany: m.findMany, findUnique: m.findUnique }, $transaction: m.transaction } }))
vi.mock('@/lib/document-storage', () => ({ readDocument: m.read, documentStorageKey: vi.fn(), putDocument: vi.fn(), removeDocument: vi.fn() }))
vi.mock('formidable', () => ({ default: () => ({ on: vi.fn(), parse: m.parse }) }))
import view from '../pages/api/documents/view'
import upload from '../pages/api/upload/create'
import remove from '../pages/api/documents/delete'
import list from '../pages/api/documents/list'
import { inviteDoctorAccess, requestPatientAccess, decideDoctorInvitation } from '../src/lib/consent'
const end = new Date('2026-10-12T12:00:00Z'), now = new Date('2026-10-13')
function res() { const r = { status: vi.fn(), json: vi.fn(), setHeader: vi.fn() }; r.status.mockReturnValue(r); return r }
beforeEach(() => { vi.resetAllMocks(); m.entitlement.mockResolvedValue(licenseAccess([{ status: 'ACTIVE', validUntil: end }], now)); m.session.mockResolvedValue({ userId: 'doctor', user: { id: 'doctor', active: true, role: 'DOCTOR' }, expiresAt: new Date('2035-01-01') }) })
it('expiry freezes metadata at the exact paid boundary, independently of the patient license', () => {
  const expired = licenseAccess([{ status: 'ACTIVE', validUntil: end }], end)
  expect(expired.active).toBe(false); expect(expired.documentWhere).toEqual({ createdAt: { lt: end } })
  expect(licenseAccess([{ status: 'ACTIVE', validUntil: new Date('2030-01-01') }], now).active).toBe(true)
})
it('renewal restores full visibility; no paid history or unknown inactive cutoff exposes no documents', () => {
  expect(licenseAccess([{ status: 'ACTIVE', validUntil: null }], now).documentWhere).toEqual({})
  expect(licenseAccess([], now).cutoff?.getTime()).toBe(0)
  expect(licenseAccess([{ status: 'INACTIVE', validUntil: new Date('2030-01-01') }], now).cutoff?.getTime()).toBe(0)
})
it('direct document view is rejected before querying the document or reading S3', async () => {
  const r = res(); await view({ method: 'GET', cookies: { pp_session: 'session' }, query: { id: 'doc' } } as never, r as never)
  expect(r.status).toHaveBeenCalledWith(403); expect(m.findUnique).not.toHaveBeenCalled(); expect(m.read).not.toHaveBeenCalled()
})
it('expired upload is rejected before multipart parsing or AWS writes', async () => {
  const r = res(); await upload({ method: 'POST', cookies: {} } as never, r as never)
  expect(r.status).toHaveBeenCalledWith(403); expect(m.parse).not.toHaveBeenCalled()
})
it('expired deletion cannot mutate data', async () => {
  const r = res(); await remove({ method: 'POST', cookies: { pp_session: 'session' }, body: { documentId: 'doc' } } as never, r as never)
  expect(r.status).toHaveBeenCalledWith(403); expect(m.transaction).not.toHaveBeenCalled()
})
it('historical API list filters on upload date and removes storage references', async () => {
  m.findMany.mockResolvedValue([{ id: 'old', filePath: 'private-key', createdAt: new Date('2026-01-01') }])
  const r = res(); await list({ method: 'GET', cookies: { pp_session: 'session' }, query: {} } as never, r as never)
  expect(m.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'doctor', deletedAt: null, createdAt: { lt: end } } }))
  expect(r.json).toHaveBeenCalledWith([expect.objectContaining({ filePath: undefined, canOpen: false })])
})
it('unlicensed actors cannot request, invite or accept new access', async () => {
  await expect(inviteDoctorAccess('patient', 'doctor')).rejects.toThrow('licencia activa')
  await expect(requestPatientAccess('doctor', 'patient')).rejects.toThrow('licencia activa')
  await expect(decideDoctorInvitation('doctor', 'invitation', true)).rejects.toThrow('licencia activa')
  expect(m.transaction).not.toHaveBeenCalled()
})
