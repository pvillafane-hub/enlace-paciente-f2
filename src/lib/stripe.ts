import 'server-only'
import Stripe from 'stripe'

// Avoid constructing the Stripe client during Next.js build/page-data collection.
// The secret is required only when a payment operation is actually executed.
let client: Stripe | undefined

function getStripeClient(): Stripe {
  if (client) return client
  const apiKey = process.env.STRIPE_SECRET_KEY
  if (!apiKey) throw new Error('STRIPE_SECRET_KEY is required for payment operations')
  client = new Stripe(apiKey, { apiVersion: '2026-03-25.dahlia' })
  return client
}

/** Preserve existing `stripe.checkout.sessions.create(...)` callers. */
export const stripe: Stripe = new Proxy({} as Stripe, {
  get(_target, property) {
    const instance = getStripeClient()
    const value = Reflect.get(instance, property, instance)
    return typeof value === 'function' ? value.bind(instance) : value
  },
})
