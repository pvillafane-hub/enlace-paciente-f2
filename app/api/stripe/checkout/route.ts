import { getStripe } from '@/lib/stripe'
import { getValidatedSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { appUrl } from '@/lib/app-url'
import { PRO_AMOUNT, PRO_PRODUCT } from '@/lib/payment-policy'
import { allowAttempt } from '@/lib/rate-limit'
import { NextResponse } from 'next/server'

export async function POST() {
  const session = await getValidatedSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = await prisma.user.findFirst({ where: { id: session.userId, active: true, role: 'DOCTOR' }, select: { id: true } })
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  if (!await allowAttempt('checkout', user.id, 3)) return NextResponse.json({ error: 'Intente más tarde' }, { status: 429 })
  const base = appUrl()
  const checkout = await getStripe().checkout.sessions.create({
    mode: 'payment', line_items: [{ price_data: { currency: 'usd', product_data: { name: 'Enlace Salud PRO' }, unit_amount: PRO_AMOUNT }, quantity: 1 }],
    success_url: `${base}/dashboard?checkout=success`, cancel_url: `${base}/dashboard?checkout=cancel`,
    metadata: { userId: user.id, product: PRO_PRODUCT },
  })
  if (!checkout.url) return NextResponse.json({ error: 'Checkout unavailable' }, { status: 503 })
  return NextResponse.redirect(checkout.url, 303)
}
