import { beforeEach, expect, it, vi } from 'vitest'
const m = vi.hoisted(() => ({ session: vi.fn(), user: vi.fn(), alerts: vi.fn(), count: vi.fn() }))
vi.mock('@/lib/auth', () => ({ getValidatedSession: m.session }))
vi.mock('@/lib/prisma', () => ({ prisma: { user: { findUnique: m.user }, medicalAlert: { findMany: m.alerts, count: m.count } } }))
vi.mock('next/navigation', () => ({ redirect: () => { throw new Error('redirect') } }))
import AlertsPage from '../app/dashboard/alerts/page'
beforeEach(() => {
  vi.resetAllMocks()
  m.session.mockResolvedValue({ userId: 'doctor' })
  m.user.mockResolvedValue({ id: 'doctor', role: 'DOCTOR', active: true })
  m.alerts.mockResolvedValue([]); m.count.mockResolvedValue(0)
})
it('pending alerts are selected before limiting, separately from history', async () => {
  await AlertsPage({ searchParams: Promise.resolve({}) })
  expect(m.alerts).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ doctorId: 'doctor', resolved: false }), take: 50, skip: 0 }))
  expect(m.alerts).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ resolved: true }), take: 50, skip: 0 }))
})
it('unauthorized patient cannot load the doctor alert list', async () => {
  m.user.mockResolvedValue({ id: 'patient', role: 'PATIENT', active: true })
  await expect(AlertsPage({ searchParams: Promise.resolve({}) })).rejects.toThrow('redirect')
  expect(m.alerts).not.toHaveBeenCalled()
})
