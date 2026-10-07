import { timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
export async function GET(req: Request) {
  const expected = process.env.CRON_SECRET
  const authorization = req.headers.get('authorization') || ''
  const wanted = expected ? `Bearer ${expected}` : ''
  if (!expected || authorization.length !== wanted.length || !timingSafeEqual(Buffer.from(authorization), Buffer.from(wanted))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const now = new Date()
  const counts = await prisma.$transaction(async tx => ({
    sessions: (await tx.session.deleteMany({ where: { expiresAt: { lte: now } } })).count,
    resetTokens: (await tx.passwordResetToken.deleteMany({ where: { expiresAt: { lte: now } } })).count,
    qrTokens: (await tx.patientQRToken.deleteMany({ where: { expiresAt: { lte: now } } })).count,
    rateLimits: (await tx.securityRateLimit.deleteMany({ where: { expiresAt: { lte: now } } })).count,
  }))
  return NextResponse.json(counts)
}
