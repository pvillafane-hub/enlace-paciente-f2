import { beforeEach, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({
  getSession: vi.fn(), parse: vi.fn(),
  user: { findUnique: vi.fn(), create: vi.fn() },
  doctorPatient: { findUnique: vi.fn(), create: vi.fn(), upsert: vi.fn() },
  clinicStaff: { findFirst: vi.fn() },
  auditLog: { create: vi.fn() }, transaction: vi.fn(),
}))
vi.mock('@/lib/prisma', () => ({ prisma: { user: mocks.user, doctorPatient: mocks.doctorPatient, clinicStaff: mocks.clinicStaff, auditLog: mocks.auditLog, $transaction: mocks.transaction } }))
vi.mock('@/lib/api-auth', () => ({ getApiSession: mocks.getSession }))
vi.mock('@/lib/auth', () => ({ hashPassword: vi.fn().mockResolvedValue('random-password-hash') }))
vi.mock('formidable', () => ({ default: () => ({ on: vi.fn(), parse: mocks.parse }) }))
vi.mock('@/lib/s3', () => ({ s3: { send: vi.fn() } }))
import createPatient from '../pages/api/staff/create-patient'
import upload from '../pages/api/upload/create'
function res() {
  const r = { status: vi.fn(), json: vi.fn(), end: vi.fn() }
  r.status.mockReturnValue(r); r.json.mockReturnValue(r); return r
}
beforeEach(() => vi.resetAllMocks())
it('unauthenticated upload is rejected before parsing multipart content', async () => {
  mocks.getSession.mockResolvedValue(null)
  const response = res()
  await upload({ method: 'POST', cookies: {} } as never, response as never)
  expect(response.status).toHaveBeenCalledWith(401)
  expect(mocks.parse).not.toHaveBeenCalled()
})
it('knowing an existing patient email cannot recreate revoked access', async () => {
  mocks.getSession.mockResolvedValue({ userId: 'd', user: { id: 'd', role: 'DOCTOR', active: true } })
  mocks.user.findUnique.mockResolvedValue({ id: 'p', fullName: 'Synthetic', email: 'patient@example.test', role: 'PATIENT', active: true })
  mocks.doctorPatient.findUnique.mockResolvedValue(null)
  const response = res()
  await createPatient({ method: 'POST', cookies: {}, body: { fullName: 'Synthetic', email: 'patient@example.test' } } as never, response as never)
  expect(response.status).toHaveBeenCalledWith(403)
  expect(mocks.transaction).not.toHaveBeenCalled()
  expect(mocks.doctorPatient.upsert).not.toHaveBeenCalled()
})
it('already authorized patient response excludes hash and clinical fields', async () => {
  mocks.getSession.mockResolvedValue({ userId: 'd', user: { id: 'd', role: 'DOCTOR', active: true } })
  mocks.user.findUnique.mockResolvedValue({ id: 'p', fullName: 'Synthetic', email: 'patient@example.test', role: 'PATIENT', active: true, passwordHash: 'never-return', allergies: 'never-return' })
  mocks.doctorPatient.findUnique.mockResolvedValue({ id: 'relation' })
  const response = res()
  await createPatient({ method: 'POST', cookies: {}, body: { fullName: 'Synthetic', email: 'patient@example.test' } } as never, response as never)
  expect(response.status).toHaveBeenCalledWith(200)
  expect(response.json).toHaveBeenCalledWith({ success: true, patient: { id: 'p', fullName: 'Synthetic', email: 'patient@example.test' } })
  expect(mocks.doctorPatient.upsert).not.toHaveBeenCalled()
})
it('inactive staff affiliation cannot create patients', async () => {
  mocks.getSession.mockResolvedValue({ userId: 's', user: { id: 's', role: 'STAFF', active: true } })
  mocks.clinicStaff.findFirst.mockResolvedValue(null)
  const response = res()
  await createPatient({ method: 'POST', cookies: {}, body: { fullName: 'Synthetic' } } as never, response as never)
  expect(response.status).toHaveBeenCalledWith(403)
  expect(mocks.user.create).not.toHaveBeenCalled()
})
