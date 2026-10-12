import { beforeEach, afterEach, it, expect, vi } from 'vitest'
const m = vi.hoisted(() => ({ session: vi.fn(), user: vi.fn(), stripe: vi.fn(), create: vi.fn(), rate: vi.fn() }))
vi.mock('@/lib/auth', () => ({ getValidatedSession: m.session }))
vi.mock('@/lib/prisma', () => ({ prisma: { user: { findFirst: m.user } } }))
vi.mock('@/lib/stripe', () => ({ getStripe: m.stripe }))
vi.mock('@/lib/rate-limit', () => ({ allowAttempt: m.rate }))
import { GET, POST } from '../app/api/stripe/checkout/route'
beforeEach(() => {
  vi.resetAllMocks()
  vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://example.test')
  vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_fixture')
  vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_fixture')
  m.session.mockResolvedValue({ userId: 'doctor' }); m.user.mockResolvedValue({ id: 'doctor' })
  m.rate.mockResolvedValue(true); m.stripe.mockReturnValue({ checkout: { sessions: { create: m.create } } })
})
afterEach(() => vi.unstubAllEnvs())
it('opening the endpoint directly never creates a payment session', async () => {
  const response = await GET()
  expect(response.status).toBe(303)
  expect(response.headers.get('location')).toBe('https://example.test/dashboard?checkout=method')
  expect(m.create).not.toHaveBeenCalled()
})
it.each(['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'])('missing %s returns a useful dashboard message instead of 500', async key => {
  vi.stubEnv(key, '')
  const response = await POST()
  expect(response.status).toBe(303)
  expect(response.headers.get('location')).toContain('checkout=unavailable')
  expect(m.stripe).not.toHaveBeenCalled()
})
it('Stripe failure returns to dashboard instead of crashing', async () => {
  m.create.mockRejectedValue(new Error('Provider unavailable'))
  expect((await POST()).headers.get('location')).toContain('checkout=failed')
})
it('only authorized doctors can start checkout', async () => {
  m.user.mockResolvedValue(null)
  expect((await POST()).status).toBe(403)
  expect(m.create).not.toHaveBeenCalled()
})
it('valid checkout retains price, metadata and safe redirect', async () => {
  m.create.mockResolvedValue({ url: 'https://checkout.stripe.com/c/pay/synthetic' })
  expect((await POST()).headers.get('location')).toBe('https://checkout.stripe.com/c/pay/synthetic')
  expect(m.create).toHaveBeenCalledWith(expect.objectContaining({ metadata: { userId: 'doctor', product: 'enlace-salud-pro' }, mode: 'payment' }))
})
