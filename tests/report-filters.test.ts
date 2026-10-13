import { beforeEach, expect, it, vi } from 'vitest'
import { reportFilters, reportDocument, reportHref } from '../src/lib/report-filters'
const m = vi.hoisted(() => ({ session: vi.fn(), doctor: vi.fn(), license: vi.fn(), patients: vi.fn(), docs: vi.fn(), count: vi.fn(), group: vi.fn(), pending: vi.fn() }))
vi.mock('@/lib/auth', () => ({ getValidatedSession: m.session }))
vi.mock('@/lib/license-access', () => ({ getLicenseAccess: m.license }))
vi.mock('@/lib/prisma', () => ({ prisma: { user: { findUnique: m.doctor }, doctorPatient: { findMany: m.patients }, document: { findMany: m.docs, count: m.count, groupBy: m.group }, medicalAccessRequest: { count: m.pending } } }))
vi.mock('next/navigation', () => ({ redirect: (path: string) => { throw new Error('redirect:' + path) } }))
import ReportsPage from '../app/dashboard/reports/page'
beforeEach(() => {
  vi.resetAllMocks(); m.session.mockResolvedValue({ userId: 'doctor' }); m.doctor.mockResolvedValue({ id: 'doctor', role: 'DOCTOR', active: true }); m.license.mockResolvedValue({ active: true, cutoff: null, documentWhere: {} })
  m.patients.mockResolvedValue([{ patientId: 'authorized', patient: { id: 'authorized', fullName: 'Synthetic' } }]); m.docs.mockResolvedValue([]); m.count.mockResolvedValue(45); m.pending.mockResolvedValue(0); m.group.mockResolvedValue([])
})
it('Hasta includes the entire selected Puerto Rico day and uses an exclusive next midnight', () => {
  const filters = reportFilters({ from: '2026-10-12', to: '2026-10-12' })
  expect(filters.from?.toISOString()).toBe('2026-10-12T04:00:00.000Z'); expect(filters.to?.toISOString()).toBe('2026-10-13T04:00:00.000Z')
})
it.each([{ from: '2026-02-30' }, { from: '2026-10-13', to: '2026-10-12' }, { q: 'a'.repeat(101) }])('rejects malformed filter: %j', params => { expect(() => reportFilters(params)).toThrow() })
it('pagination preserves all search filters', () => {
  expect(reportHref({ q: 'Ana', patient: 'authorized', type: 'Laboratorio', to: '2026-10-12' }, { page: '2' })).toContain('q=Ana&patient=authorized&type=Laboratorio&to=2026-10-12&page=2')
})
it('report DTO excludes storage paths, credentials and clinical profile fields', () => {
  const doc = { id: 'doc', userId: 'patient', filename: 'Study.pdf', docType: 'Laboratorio', facility: 'Clinic', studyDate: '2026-10-01', createdAt: new Date('2026-10-12'), filePath: 'private-key', user: { fullName: 'Synthetic', passwordHash: 'secret', allergies: 'private' } }
  expect(Object.keys(reportDocument(doc))).toEqual(['id','patientId','patientName','filename','docType','facility','studyDate','createdAt'])
})
it('search and pagination apply in the database to all authorized documents, not to the latest twenty only', async () => {
  await ReportsPage({ searchParams: Promise.resolve({ q: 'old study', page: '2' }) })
  expect(m.docs).toHaveBeenCalledWith(expect.objectContaining({ skip: 20, take: 20, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], where: { AND: [expect.objectContaining({ userId: { in: ['authorized'] }, deletedAt: null }), expect.objectContaining({ OR: expect.arrayContaining([{ filename: { contains: 'old study', mode: 'insensitive' } }]) })] } }))
})
it('date filtering intersects rather than replaces the expired-license cutoff', async () => {
  const cutoff = new Date('2026-10-10'); m.license.mockResolvedValue({ active: false, cutoff, documentWhere: { createdAt: { lt: cutoff } } })
  await ReportsPage({ searchParams: Promise.resolve({ from: '2026-10-01', to: '2026-10-12' }) })
  expect(m.docs).toHaveBeenCalledWith(expect.objectContaining({ where: { AND: [expect.objectContaining({ createdAt: { lt: cutoff } }), expect.objectContaining({ createdAt: { gte: new Date('2026-10-01T04:00:00Z'), lt: new Date('2026-10-13T04:00:00Z') } })] } }))
  expect(m.pending).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ createdAt: { lt: cutoff } }) }))
})
it('forged patient filters cannot expose another clinic records', async () => {
  await ReportsPage({ searchParams: Promise.resolve({ patient: 'unrelated' }) })
  expect(m.docs).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id: { in: [] }, userId: { in: ['authorized'] } }) }))
})
it('pending counts separate received invitations from requests awaiting patient approval', async () => {
  await ReportsPage({ searchParams: Promise.resolve({}) })
  expect(m.pending).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ initiatedBy: 'PATIENT', patient: { active: true, role: 'PATIENT' } }) }))
  expect(m.pending).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ OR: [{ initiatedBy: 'DOCTOR' }, { initiatedBy: null }] }) }))
})
it('inactive doctors and patient roles are rejected before report data is queried', async () => {
  m.doctor.mockResolvedValue({ id: 'doctor', role: 'DOCTOR', active: false }); await expect(ReportsPage({ searchParams: Promise.resolve({}) })).rejects.toThrow('redirect')
  expect(m.docs).not.toHaveBeenCalled()
})
