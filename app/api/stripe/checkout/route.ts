import { getStripe } from '@/lib/stripe'
import { getValidatedSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { appUrl } from '@/lib/app-url'
import { PRO_AMOUNT, PRO_PRODUCT } from '@/lib/payment-policy'
import { allowAttempt } from '@/lib/rate-limit'
import { NextResponse } from 'next/server'

// Opening this URL never creates a payment session. Use the dashboard form.
export async function GET() {
  return NextResponse.redirect(`${appUrl()}/dashboard?checkout=method`, 303)
}

export async function POST() {
  const session = await getValidatedSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = await prisma.user.findFirst({ where: { id: session.userId, active: true, role: 'DOCTOR' }, select: { id: true } })
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  const base = appUrl()
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    console.warn('CHECKOUT_NOT_CONFIGURED')
    return NextResponse.redirect(`${base}/dashboard?checkout=unavailable`, 303)
  }
  if (!await allowAttempt('checkout', user.id, 3)) return NextResponse.redirect(`${base}/dashboard?checkout=rate-limited`, 303)
  try {
    const checkout = await getStripe().checkout.sessions.create({
      mode: 'payment', line_items: [{ price_data: { currency: 'usd', product_data: { name: 'Enlace Salud PRO' }, unit_amount: PRO_AMOUNT }, quantity: 1 }],
      success_url: `${base}/dashboard?checkout=success`, cancel_url: `${base}/dashboard?checkout=cancel`,
      metadata: { userId: user.id, product: PRO_PRODUCT },
    })
    if (!checkout.url) throw new Error('Checkout URL missing')
    const destination = new URL(checkout.url)
    if (destination.protocol !== 'https:' || destination.hostname !== 'checkout.stripe.com') throw new Error('Invalid checkout destination')
    return NextResponse.redirect(destination.toString(), 303)
  } catch {
    console.error('CHECKOUT_SESSION_FAILED')
    return NextResponse.redirect(`${base}/dashboard?checkout=failed`, 303)
  }
}
