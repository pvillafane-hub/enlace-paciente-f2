import { beforeEach, it, expect, vi } from 'vitest'
import { createHmac } from 'node:crypto'
const db = vi.hoisted(() => ({
  $transaction: vi.fn(), paymentEvent: { create: vi.fn(), findUnique: vi.fn() },
  user: { findFirst: vi.fn() }, license: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() }, auditLog: { create: vi.fn() },
}))
vi.mock('@/lib/prisma', () => ({ prisma: db }))
vi.mock('@/lib/stripe', async () => {
  const { default: Stripe } = await import('stripe')
  return { getStripe: () => new Stripe('sk_test_fixture') }
})
import { POST } from '../app/api/stripe/webhook/route'
const secret = 'whsec_test_fixture'
const checkout = { id: 'cs_test_fixture', payment_status: 'paid', mode: 'payment', currency: 'usd', amount_total: 10000, metadata: { product: 'enlace-salud-pro', userId: 'd' } }
function request(overrides = {}, valid = true) {
  const payload = JSON.stringify({ id: 'evt_test', type: 'checkout.session.completed', data: { object: { ...checkout, ...overrides } } })
  const timestamp = Math.floor(Date.now() / 1000)
  const digest = createHmac('sha256', valid ? secret : 'wrong-secret').update(`${timestamp}.${payload}`).digest('hex')
  const signature = `t=${timestamp},v1=${digest}`
  return new Request('http://localhost/api/stripe/webhook', { method: 'POST', body: payload, headers: { 'stripe-signature': signature } })
}
beforeEach(() => {
  vi.resetAllMocks(); vi.stubEnv('STRIPE_WEBHOOK_SECRET', secret)
  db.$transaction.mockImplementation(async fn => fn(db))
  db.user.findFirst.mockResolvedValue({ id: 'd' })
  db.license.findFirst.mockResolvedValue(null)
})
it('rejects a real invalid Stripe signature before touching DB', async () => {
  expect((await POST(request({}, false))).status).toBe(400)
  expect(db.$transaction).not.toHaveBeenCalled()
})
it('unpaid event does not activate a license', async () => {
  expect((await POST(request({ payment_status: 'unpaid' }))).status).toBe(200)
  expect(db.$transaction).not.toHaveBeenCalled()
})
it('a verified paid event persists license and audit', async () => {
  expect((await POST(request())).status).toBe(200)
  expect(db.paymentEvent.create).toHaveBeenCalledWith({ data: { id: checkout.id } })
  expect(db.license.create).toHaveBeenCalledOnce()
  expect(db.auditLog.create).toHaveBeenCalledOnce()
})
it('DB failure returns retryable 500', async () => {
  db.$transaction.mockRejectedValue(new Error('Database unavailable'))
  db.paymentEvent.findUnique.mockResolvedValue(null)
  expect((await POST(request())).status).toBe(500)
})
it('already persisted checkout is acknowledged without applying a second payment', async () => {
  db.$transaction.mockRejectedValue(new Error('Duplicate checkout'))
  db.paymentEvent.findUnique.mockResolvedValue({ id: checkout.id })
  expect((await POST(request())).status).toBe(200)
  expect(db.license.create).not.toHaveBeenCalled()
})
