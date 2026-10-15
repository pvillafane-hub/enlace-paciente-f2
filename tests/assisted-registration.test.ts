import { beforeEach, expect, it, vi } from 'vitest'
const m = vi.hoisted(() => ({ session: vi.fn(), license: vi.fn(), clinic: vi.fn(), hash: vi.fn(), user: { findUnique: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn() }, relation: { findUnique: vi.fn(), create: vi.fn() }, review: vi.fn(), audit: vi.fn(), transaction: vi.fn() }))
vi.mock('@/lib/api-auth', () => ({ getApiSession: m.session }))
vi.mock('@/lib/license-access', () => ({ getLicenseAccess: m.license }))
vi.mock('@/lib/access', () => ({ clinicDoctorId: m.clinic }))
vi.mock('@/lib/auth', () => ({ hashPassword: m.hash }))
vi.mock('@/lib/prisma', () => ({ prisma: { user: m.user, doctorPatient: m.relation, auditLog: { create: m.audit }, $transaction: m.transaction } }))
import handler from '../pages/api/staff/create-patient'
const birth = new Date('1950-01-01')
const patient = { id: 'synthetic-patient', fullName: 'Paciente Sintético', dateOfBirth: birth }
const body = { intent: 'register', fullName: 'Paciente Sintético', dateOfBirth: '1950-01-01', authorizationConfirmed: true }
function res() { const r = { status: vi.fn(), json: vi.fn(), end: vi.fn(), setHeader: vi.fn() }; r.status.mockReturnValue(r); return r }
async function call(data: unknown) { const r = res(); await handler({ method: 'POST', cookies: {}, body: data } as never, r as never); return r }
beforeEach(() => {
  vi.resetAllMocks(); m.session.mockResolvedValue({ userId: 'employee', user: { role: 'STAFF' } }); m.license.mockResolvedValue({ active: true }); m.clinic.mockResolvedValue('doctor')
  m.user.findUnique.mockResolvedValue(null); m.user.findFirst.mockResolvedValue(null); m.user.findMany.mockResolvedValue([]); m.user.create.mockResolvedValue(patient); m.hash.mockResolvedValue('internal-unusable-password')
  m.transaction.mockImplementation(async fn => fn({ identityReview: { create: m.review }, user: m.user, doctorPatient: m.relation, auditLog: { create: m.audit } }))
})
it('search is scoped to the staff doctor and excludes passwords, clinical fields and other clinic records', async () => {
  m.user.findMany.mockResolvedValue([patient]); const r = await call({ intent: 'search', fullName: 'Paciente' })
  expect(r.status).toHaveBeenCalledWith(200)
  expect(m.user.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ active: true, role: 'PATIENT', patientDoctors: { some: { doctorId: 'doctor' } } }), select: { id: true, fullName: true, dateOfBirth: true }, take: 6 }))
  expect(m.user.create).not.toHaveBeenCalled(); expect(m.transaction).not.toHaveBeenCalled()
})
it.each([{ authorizationConfirmed: false }, { authorizationConfirmed: 'true' }, { dateOfBirth: '' }, { dateOfBirth: '1950-02-30' }, { dateOfBirth: '2090-01-01' }])('invalid birth or missing explicit authorization prevents creation: %j', async override => {
  const r = await call({ ...body, ...override }); expect(r.status).toHaveBeenCalledWith(400); expect(m.transaction).not.toHaveBeenCalled()
})
it('new assisted record stores birth and employee attestation without activating patient access or a license', async () => {
  const r = await call({ ...body, fullName: '  Paciente   Sintético  ' })
  expect(r.status).toHaveBeenCalledWith(201)
  expect(m.user.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ fullName: 'Paciente Sintético', dateOfBirth: birth, email: expect.stringMatching(/^patient-.*@enlacesalud.local$/) }), select: { id: true, fullName: true, dateOfBirth: true } }))
  expect(m.relation.create).toHaveBeenCalledWith({ data: { doctorId: 'doctor', patientId: patient.id } })
  expect(m.audit).toHaveBeenCalledWith({ data: expect.objectContaining({ userId: 'employee', entityId: patient.id, metadata: expect.objectContaining({ doctorId: 'doctor', actorRole: 'STAFF', authorization: expect.objectContaining({ confirmed: true }), personalAccessActivated: false }) }) })
  expect(m.transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: 'Serializable' })
})
it('same clinic name and birth is reviewed rather than automatically treating two people as the same patient', async () => {
  m.user.findMany.mockResolvedValue([{ ...patient, contactPhone: null }]); const r = await call(body)
  expect(r.status).toHaveBeenCalledWith(202)
  expect(m.review).toHaveBeenCalled()
  expect(m.relation.create).not.toHaveBeenCalled()
})
it('an existing email never lets staff bypass consent or recreate revoked access', async () => {
  m.user.findUnique.mockResolvedValue({ ...patient, role: 'PATIENT', active: true }); m.relation.findUnique.mockResolvedValue(null)
  const r = await call({ ...body, email: 'synthetic@example.test' }); expect(r.status).toHaveBeenCalledWith(403)
  expect(r.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'CONSENT_REQUIRED' })); expect(m.transaction).not.toHaveBeenCalled()
})
it('mismatched birth for an authorized email stops before mutation', async () => {
  m.user.findUnique.mockResolvedValue({ ...patient, role: 'PATIENT', active: true }); m.relation.findUnique.mockResolvedValue({ id: 'existing-relation' })
  const r = await call({ ...body, dateOfBirth: '1951-01-01', email: 'synthetic@example.test' }); expect(r.status).toHaveBeenCalledWith(409); expect(m.transaction).not.toHaveBeenCalled()
})
it('a concurrent email registration cannot grant access to the newly existing account', async () => {
  m.user.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'concurrent-patient' })
  const r = await call({ ...body, email: 'synthetic@example.test' }); expect(r.status).toHaveBeenCalledWith(409); expect(m.relation.create).not.toHaveBeenCalled()
})
it('staff cannot search or create while the doctor license is inactive', async () => {
  m.license.mockResolvedValue({ active: false }); const r = await call({ intent: 'search', fullName: 'Paciente' })
  expect(r.status).toHaveBeenCalledWith(403); expect(m.user.findMany).not.toHaveBeenCalled()
})

it('global match at another clinic creates a held record and Admin review without disclosing candidates or granting clinic access', async () => {
  m.user.findMany.mockResolvedValue([{ id: 'other-clinic', fullName: patient.fullName, contactPhone: null }])
  const r = await call(body)
  expect(r.status).toHaveBeenCalledWith(202)
  expect(r.json).toHaveBeenCalledWith(expect.objectContaining({ held: true }))
  expect(JSON.stringify(r.json.mock.calls)).not.toContain('other-clinic')
  expect(m.user.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ active: false, identityStatus: 'HOLD' }) }))
  expect(m.review).toHaveBeenCalledWith({ data: { userId: patient.id, candidateIds: ['other-clinic'], doctorId: 'doctor' } })
  expect(m.relation.create).not.toHaveBeenCalled()
})
