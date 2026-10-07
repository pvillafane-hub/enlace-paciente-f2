import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { randomBytes, createHash } from 'node:crypto'
import { allowAttempt } from '@/lib/rate-limit'
import { sendResetEmail } from '@/lib/reset-email'

export async function POST(req: Request) {
  const response = () => NextResponse.json({ message: 'Si la cuenta está disponible, recibirá instrucciones.' })
  try {
    const { email } = await req.json()
    if (typeof email !== 'string' || email.length > 254) return response()
    const normalizedEmail = email.trim().toLowerCase()
    if (!await allowAttempt('forgot-password', normalizedEmail, 3)) return response()
    const user = await prisma.user.findFirst({ where: { email: normalizedEmail, active: true }, select: { id: true, email: true } })
    if (!user) return response()
    const token = randomBytes(32).toString('hex')
    const reset = await prisma.passwordResetToken.create({ data: { userId: user.id, tokenHash: createHash('sha256').update(token).digest('hex'), expiresAt: new Date(Date.now() + 15 * 60 * 1000) } })
    try { await sendResetEmail(user.email, token) }
    catch {
      await prisma.passwordResetToken.update({ where: { id: reset.id }, data: { used: true } })
      console.error('RESET_EMAIL_DELIVERY_FAILED')
    }
    return response()
  } catch { console.error('RESET_REQUEST_FAILED'); return response() }
}
