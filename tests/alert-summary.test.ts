import { beforeEach, expect, it, vi } from 'vitest'
import { parseAlertSummary, alertMessage } from '../src/lib/alert-summary'
const m = vi.hoisted(() => ({ session: vi.fn(), license: vi.fn(), actor: vi.fn(), clinic: vi.fn(), count: vi.fn(), find: vi.fn(), transaction: vi.fn() }))
vi.mock('@/lib/auth', () => ({ getValidatedSession: m.session }))
vi.mock('@/lib/license-access', () => ({ getLicenseAccess: m.license }))
vi.mock('@/lib/access', () => ({ clinicDoctorId: m.clinic }))
vi.mock('@/lib/prisma', () => ({ prisma: { user: { findUnique: m.actor }, $transaction: m.transaction } }))
import { GET } from '../app/api/alerts/route'
import { doctorAlertSummary } from '../src/lib/doctor-alert-summary'
const alert = { id: 'a', type: 'NO_ACTIVITY', patientName: 'Synthetic', patientId: 'p', createdAt: '2026-10-13T12:00:00.000Z' }
beforeEach(() => {
  vi.resetAllMocks(); m.session.mockResolvedValue({ userId: 'doctor' }); m.license.mockResolvedValue({ active: true }); m.actor.mockResolvedValue({ id: 'doctor' }); m.clinic.mockResolvedValue('doctor')
  m.count.mockResolvedValue(12); m.find.mockResolvedValue([{ id: 'a', type: 'NO_ACTIVITY', patientId: 'p', createdAt: new Date(alert.createdAt), patient: { fullName: 'Synthetic' } }]); m.transaction.mockImplementation(async fn => fn({ medicalAlert: { count: m.count, findMany: m.find } }))
})
it('badge carries the total pending count rather than the preview size', async () => {
  const summary = await doctorAlertSummary('doctor'); expect(summary).toEqual({ status: 'ready', total: 12, alerts: [alert] })
  expect(m.find).toHaveBeenCalledWith(expect.objectContaining({ take: 5, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] }))
  expect(m.transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: 'RepeatableRead' })
})
it('count and preview both require active authorized patients and unresolved alerts', async () => {
  await doctorAlertSummary('doctor')
  const where = { doctorId: 'doctor', resolved: false, patient: { active: true, role: 'PATIENT', patientDoctors: { some: { doctorId: 'doctor' } } } }
  expect(m.count).toHaveBeenCalledWith({ where }); expect(m.find).toHaveBeenCalledWith(expect.objectContaining({ where }))
})
it('license expiry returns an explicit unavailable state with no patient data', async () => {
  m.license.mockResolvedValue({ active: false }); const response = await GET()
  expect(await response.json()).toEqual({ status: 'license-required', alerts: [], total: 0 }); expect(m.transaction).not.toHaveBeenCalled()
})
it('expired session and lost affiliation deny access without fetching alerts', async () => {
  m.session.mockResolvedValueOnce(null); expect((await GET()).status).toBe(401)
  m.clinic.mockResolvedValue(null); expect((await GET()).status).toBe(403); expect(m.find).not.toHaveBeenCalled()
})
it('API uses a no-store response with a minimal alert DTO', async () => {
  const response = await GET(); expect(response.headers.get('Cache-Control')).toBe('private, no-store'); expect(await response.json()).toEqual({ status: 'ready', total: 12, alerts: [alert] })
})
it('dependency errors produce a temporary error, not an empty-success response', async () => {
  m.transaction.mockRejectedValue(new Error('unavailable')); const response = await GET(); expect(response.status).toBe(503)
})
it.each([null, [], { status: 'ready', total: 0, alerts: [alert] }, { status: 'license-required', total: 1, alerts: [alert] }, { status: 'ready', total: 2, alerts: [{ ...alert, patientId: null }] }, { status: 'ready', total: -1, alerts: [] }])('malformed responses cannot populate the bell: %j', value => {
  expect(parseAlertSummary(value)).toBeNull()
})
it('parser strips unexpected fields and messages do not invent medical risk', () => {
  expect(parseAlertSummary({ status: 'ready', total: 1, alerts: [{ ...alert, passwordHash: 'secret' }] })).toEqual({ status: 'ready', total: 1, alerts: [alert] })
  expect(alertMessage('HIGH_RISK_PATIENT')).toBe('Alerta registrada para revisión'); expect(alertMessage('NO_ACTIVITY')).toContain('documental')
})
