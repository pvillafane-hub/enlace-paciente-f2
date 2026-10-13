import { beforeEach, expect, it, vi } from 'vitest'
import { parsePatientProfile, allergyState, UNKNOWN_PROFILE_VALUE, NO_KNOWN_ALLERGIES } from '../src/lib/patient-profile-policy'
const m = vi.hoisted(() => ({ session: vi.fn(), license: vi.fn(), actor: vi.fn(), transaction: vi.fn(), update: vi.fn(), audit: vi.fn() }))
vi.mock('@/lib/auth', () => ({ getValidatedSession: m.session }))
vi.mock('@/lib/license-access', () => ({ getLicenseAccess: m.license }))
vi.mock('@/lib/prisma', () => ({ prisma: { user: { findFirst: m.actor }, $transaction: m.transaction } }))
import { POST } from '../app/api/patient/update-info/route'
const values = { dateOfBirth: '1950-01-01', bloodType: 'O+', allergies: 'Penicilina', allergyState: 'known' }
beforeEach(() => {
  vi.resetAllMocks(); m.session.mockResolvedValue({ userId: 'patient' }); m.actor.mockResolvedValue({ id: 'patient' }); m.license.mockResolvedValue({ active: true })
  m.transaction.mockImplementation(async fn => fn({ user: { update: m.update }, auditLog: { create: m.audit } }))
})
function request(body: unknown) { return new Request('https://example.test/api/patient/update-info', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }) }
it.each([{}, null, [], { bloodType: 'O+' }, { ...values, dateOfBirth: false }, { ...values, allergies: 0 }, { ...values, allergyState: ['none'] }])('invalid or missing fields cannot clear existing data: %j', async body => {
  const response = await POST(request(body)); expect(response.status).toBe(400); expect(m.update).not.toHaveBeenCalled()
})
it.each(['1950-02-30', '2090-01-01', '1800-01-01'])('rejects impossible, future or out-of-range birth: %s', date => {
  expect(() => parsePatientProfile({ ...values, dateOfBirth: date })).toThrow()
})
it('birth is a date-only value in UTC, preserving the selected calendar date', () => {
  expect(parsePatientProfile(values).dateOfBirth?.toISOString()).toBe('1950-01-01T00:00:00.000Z')
  expect(new Intl.DateTimeFormat('en-CA', { timeZone: 'UTC', year: 'numeric', month: '2-digit', day: '2-digit' }).format(parsePatientProfile(values).dateOfBirth!)).toBe('1950-01-01')
})
it('unknown blood and allergies remain explicit, not mistaken for absence', () => {
  expect(parsePatientProfile({ ...values, bloodType: UNKNOWN_PROFILE_VALUE, allergyState: 'unknown' })).toEqual(expect.objectContaining({ bloodType: UNKNOWN_PROFILE_VALUE, allergies: UNKNOWN_PROFILE_VALUE }))
  expect(allergyState(UNKNOWN_PROFILE_VALUE)).toBe('unknown'); expect(allergyState('Ninguna')).toBe('none')
})
it('no known allergies persists a distinct answer; known allergies require details', () => {
  expect(parsePatientProfile({ ...values, allergyState: 'none' }).allergies).toBe(NO_KNOWN_ALLERGIES)
  expect(() => parsePatientProfile({ ...values, allergies: ' ', allergyState: 'known' })).toThrow('Escribe')
  expect(() => parsePatientProfile({ ...values, allergies: 'a'.repeat(2001) })).toThrow()
})
it('a valid update uses only session owner and audits self-reported fields without clinical values', async () => {
  const response = await POST(request({ ...values, userId: 'another-patient' })); expect(response.status).toBe(200)
  expect(m.update).toHaveBeenCalledWith({ where: { id: 'patient' }, data: parsePatientProfile(values) })
  expect(m.audit).toHaveBeenCalledWith({ data: { userId: 'patient', action: 'PATIENT_PROFILE_UPDATED', metadata: { fields: ['dateOfBirth','bloodType','allergies'], source: 'patient_self_reported' } } })
})
it('non-patient and unlicensed accounts cannot change clinical information', async () => {
  m.actor.mockResolvedValueOnce(null); expect((await POST(request(values))).status).toBe(403)
  m.license.mockResolvedValue({ active: false }); expect((await POST(request(values))).status).toBe(403); expect(m.update).not.toHaveBeenCalled()
})
it('expired session and malformed JSON return actionable client errors without writing', async () => {
  m.session.mockResolvedValueOnce(null); expect((await POST(request(values))).status).toBe(401)
  expect((await POST(new Request('https://example.test', { method: 'POST', body: '{' }))).status).toBe(400); expect(m.update).not.toHaveBeenCalled()
})
