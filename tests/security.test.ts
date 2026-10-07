import { describe, it, expect, vi, beforeEach } from 'vitest'
import { validPassword } from '../src/lib/password-policy'
import { detectDocumentType, validDateOnly } from '../src/lib/file-policy'
import { hasActiveLicense, isPro } from '../src/lib/license-policy'
import { validProPayment } from '../src/lib/payment-policy'
import { isSessionUsable } from '../src/lib/session-policy'

const db = vi.hoisted(() => ({
  user: { findFirst: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
  medicalAccessRequest: { findFirst: vi.fn(), updateMany: vi.fn(), upsert: vi.fn() },
  doctorPatient: { findUnique: vi.fn(), upsert: vi.fn() },
  clinicStaff: { findFirst: vi.fn() },
  passwordResetToken: { findFirst: vi.fn(), updateMany: vi.fn() },
  session: { deleteMany: vi.fn() },
  auditLog: { create: vi.fn() },
  $transaction: vi.fn(),
}))
vi.mock('@/lib/prisma', () => ({ prisma: db }))
vi.mock('@/lib/rate-limit', () => ({ allowAttempt: vi.fn().mockResolvedValue(true) }))
vi.mock('bcrypt', () => ({ default: { hash: vi.fn().mockResolvedValue('bcrypt-hash'), compare: vi.fn().mockResolvedValue(true) } }))
import { decideAccess, requestPatientAccess } from '../src/lib/consent'
import { canReadPatient } from '../src/lib/access'
import resetHandler from '../pages/api/auth/reset-password'

beforeEach(() => {
  vi.resetAllMocks()
  db.$transaction.mockImplementation(async fn => fn(db))
  db.auditLog.create.mockResolvedValue({})
})

describe('session and input policies', () => {
  const now = new Date('2026-10-07')
  const session = { userId: 'p', createdAt: new Date(now.getTime() - 1000), expiresAt: new Date(now.getTime() + 1000) }
  const user = { active: true, passwordChangedAt: null }
  it('accepts active session but rejects expiry, disabled account, reset and challenges', () => {
    expect(isSessionUsable(session, user, now)).toBe(true)
    expect(isSessionUsable({ ...session, expiresAt: now }, user, now)).toBe(false)
    expect(isSessionUsable(session, { ...user, active: false }, now)).toBe(false)
    expect(isSessionUsable(session, { ...user, passwordChangedAt: now }, now)).toBe(false)
    expect(isSessionUsable({ ...session, userId: null }, user, now)).toBe(false)
    expect(isSessionUsable({ ...session, createdAt: new Date(now.getTime() - 31 * 86400000) }, user, now)).toBe(false)
  })
  it('enforces identical password strength and bcrypt byte limits', () => {
    expect(validPassword('Testing1!')).toBe(true)
    for (const password of ['weak', 'Password!', 'password1!', 'PASSWORD1!', 'Password12', 'A1!' + 'é'.repeat(36), null]) expect(validPassword(password)).toBe(false)
  })
  it('rejects impossible dates and untrusted content signatures', () => {
    expect(validDateOnly('2024-02-29')).toBe(true)
    expect(validDateOnly('2025-02-29')).toBe(false)
    expect(validDateOnly('2026-02-31')).toBe(false)
    expect(detectDocumentType(Buffer.from('<svg><script>alert(1)</script></svg>'))).toBeNull()
    expect(detectDocumentType(Buffer.from('%PDF-1.7'))).toBe('application/pdf')
    expect(detectDocumentType(Buffer.from([137,80,78,71,13,10,26,10]))).toBe('image/png')
  })
  it('expires licenses at the exact deadline', () => {
    expect(hasActiveLicense({ status: 'ACTIVE', validUntil: now }, now)).toBe(false)
    expect(isPro({ status: 'INACTIVE', plan: 'PRO' }, now)).toBe(false)
    expect(isPro({ status: 'ACTIVE', plan: 'PRO', validUntil: null }, now)).toBe(true)
  })
  it('requires actual paid checkout, product, amount and currency', () => {
    const payment = { payment_status: 'paid', mode: 'payment', currency: 'usd', amount_total: 10000, metadata: { product: 'enlace-salud-pro', userId: 'd' } }
    expect(validProPayment(payment)).toBe(true)
    expect(validProPayment({ ...payment, payment_status: 'unpaid' })).toBe(false)
    expect(validProPayment({ ...payment, amount_total: 1 })).toBe(false)
    expect(validProPayment({ ...payment, metadata: { userId: 'd' } })).toBe(false)
    expect(validProPayment({ ...payment, currency: 'eur' })).toBe(false)
  })
})

describe('patient consent and record access', () => {
  it('rejects approving another patient’s request without creating access', async () => {
    db.user.findFirst.mockResolvedValue({ id: 'patient-a' })
    db.medicalAccessRequest.findFirst.mockResolvedValue(null)
    await expect(decideAccess('patient-a', 'request-for-patient-b', true)).rejects.toThrow()
    expect(db.medicalAccessRequest.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ patientId: 'patient-a' }) }))
    expect(db.doctorPatient.upsert).not.toHaveBeenCalled()
  })
  it('rejects a replay/concurrent decision after the request was consumed', async () => {
    db.user.findFirst.mockResolvedValue({ id: 'p' })
    db.medicalAccessRequest.findFirst.mockResolvedValue({ id: 'r', doctorId: 'd' })
    db.medicalAccessRequest.updateMany.mockResolvedValue({ count: 0 })
    await expect(decideAccess('p', 'r', true)).rejects.toThrow()
    expect(db.doctorPatient.upsert).not.toHaveBeenCalled()
  })
  it('creates authorized access and audit only after a successful patient decision', async () => {
    db.user.findFirst.mockResolvedValue({ id: 'p' })
    db.medicalAccessRequest.findFirst.mockResolvedValue({ id: 'r', doctorId: 'd' })
    db.medicalAccessRequest.updateMany.mockResolvedValue({ count: 1 })
    await decideAccess('p', 'r', true)
    expect(db.doctorPatient.upsert).toHaveBeenCalledOnce()
    expect(db.auditLog.create).toHaveBeenCalledOnce()
  })
  it('rejecting does not grant access', async () => {
    db.user.findFirst.mockResolvedValue({ id: 'p' })
    db.medicalAccessRequest.findFirst.mockResolvedValue({ id: 'r', doctorId: 'd' })
    db.medicalAccessRequest.updateMany.mockResolvedValue({ count: 1 })
    await decideAccess('p', 'r', false)
    expect(db.doctorPatient.upsert).not.toHaveBeenCalled()
  })
  it('non-doctor cannot request patient access', async () => {
    db.user.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'p' })
    await expect(requestPatientAccess('not-doctor', 'p')).rejects.toThrow()
    expect(db.medicalAccessRequest.upsert).not.toHaveBeenCalled()
  })
  it('unrelated patient and revoked staff cannot read records', async () => {
    db.user.findFirst.mockResolvedValue({ id: 'patient-b' })
    expect(await canReadPatient({ id: 'patient-a', role: 'PATIENT', active: true }, 'patient-b')).toBe(false)
    db.clinicStaff.findFirst.mockResolvedValue(null)
    expect(await canReadPatient({ id: 'staff', role: 'STAFF', active: true }, 'patient-b')).toBe(false)
    expect(db.doctorPatient.findUnique).not.toHaveBeenCalled()
  })
  it('authorized staff inherits only its active physician’s patient relation', async () => {
    db.user.findFirst.mockResolvedValue({ id: 'p' })
    db.clinicStaff.findFirst.mockResolvedValue({ doctorId: 'd' })
    db.doctorPatient.findUnique.mockResolvedValue({ id: 'relationship' })
    expect(await canReadPatient({ id: 's', role: 'STAFF', active: true }, 'p')).toBe(true)
    expect(db.doctorPatient.findUnique).toHaveBeenCalledWith({ where: { doctorId_patientId: { doctorId: 'd', patientId: 'p' } } })
  })
})

import bcrypt from 'bcrypt'
import { allowAttempt } from '../src/lib/rate-limit'
function response() {
  const res = { status: vi.fn(), json: vi.fn(), end: vi.fn() }
  res.status.mockReturnValue(res)
  res.json.mockReturnValue(res)
  return res
}
describe('password reset consumption', () => {
  beforeEach(() => {
    vi.mocked(allowAttempt).mockResolvedValue(true)
    vi.mocked(bcrypt.hash).mockResolvedValue('new-bcrypt-hash' as never)
  })
  it('invalid strength fails before any database operation', async () => {
    const res = response()
    await resetHandler({ method: 'POST', body: { token: 'a'.repeat(64), password: 'weak' } } as never, res as never)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(db.$transaction).not.toHaveBeenCalled()
  })
  it('expired/used token never changes a password', async () => {
    db.passwordResetToken.findFirst.mockResolvedValue(null)
    const res = response()
    await resetHandler({ method: 'POST', body: { token: 'a'.repeat(64), password: 'Testing1!' } } as never, res as never)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(db.user.update).not.toHaveBeenCalled()
  })
  it('concurrent token consumption cannot update the account twice', async () => {
    db.passwordResetToken.findFirst.mockResolvedValue({ id: 't', userId: 'p' })
    db.passwordResetToken.updateMany.mockResolvedValueOnce({ count: 0 })
    const res = response()
    await resetHandler({ method: 'POST', body: { token: 'a'.repeat(64), password: 'Testing1!' } } as never, res as never)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(db.user.update).not.toHaveBeenCalled()
  })
  it('successful reset changes password, revokes sessions and audits', async () => {
    db.passwordResetToken.findFirst.mockResolvedValue({ id: 't', userId: 'p' })
    db.passwordResetToken.updateMany.mockResolvedValue({ count: 1 })
    const res = response()
    await resetHandler({ method: 'POST', body: { token: 'a'.repeat(64), password: 'Testing1!' } } as never, res as never)
    expect(res.status).toHaveBeenCalledWith(200)
    expect(db.user.update).toHaveBeenCalledWith(expect.objectContaining({ data: { passwordHash: 'new-bcrypt-hash', passwordChangedAt: expect.any(Date) } }))
    expect(db.session.deleteMany).toHaveBeenCalledWith({ where: { userId: 'p' } })
    expect(db.auditLog.create).toHaveBeenCalledOnce()
  })
})
