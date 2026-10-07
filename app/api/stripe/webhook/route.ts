import { getStripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { validProPayment } from '@/lib/payment-policy'
import type Stripe from 'stripe'

export async function POST(req: Request) {
  const sig = req.headers.get('stripe-signature')
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!sig) return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  if (!secret) return NextResponse.json({ error: 'Webhook unavailable' }, { status: 503 })
  let event: Stripe.Event
  try { event = getStripe().webhooks.constructEvent(await req.text(), sig, secret) }
  catch { return NextResponse.json({ error: 'Invalid webhook' }, { status: 400 }) }
  if (!['checkout.session.completed', 'checkout.session.async_payment_succeeded'].includes(event.type)) return NextResponse.json({ received: true })
  const session = event.data.object as Stripe.Checkout.Session
  if (!validProPayment(session)) return NextResponse.json({ received: true })
  const userId = session.metadata!.userId
  try {
    await prisma.$transaction(async tx => {
      // A checkout may emit multiple successful events; consume the checkout ID once.
      await tx.paymentEvent.create({ data: { id: session.id } })
      if (!await tx.user.findFirst({ where: { id: userId, role: 'DOCTOR', active: true }, select: { id: true } })) throw new Error('User unavailable')
      const license = await tx.license.findFirst({ where: { userId, role: 'DOCTOR' } })
      if (license) await tx.license.update({ where: { id: license.id }, data: { status: 'ACTIVE', plan: 'PRO', validUntil: null } })
      else await tx.license.create({ data: { userId, role: 'DOCTOR', status: 'ACTIVE', plan: 'PRO' } })
      await tx.auditLog.create({ data: { userId, action: 'LICENSE_PAYMENT_APPLIED', entityId: session.id } })
    })
  } catch {
    if (await prisma.paymentEvent.findUnique({ where: { id: session.id } })) return NextResponse.json({ received: true })
    console.error('PAYMENT_PERSISTENCE_FAILED')
    return NextResponse.json({ error: 'Retry later' }, { status: 500 })
  }
  return NextResponse.json({ received: true })
}
