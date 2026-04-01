import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'
import bcrypt from 'bcrypt'

export async function POST(req: Request) {
  const { email } = await req.json()

  if (!email) {
    return NextResponse.json({ message: 'OK' })
  }

  const user = await prisma.user.findUnique({
    where: { email },
  })

  if (user) {
    const rawToken = crypto.randomBytes(32).toString('hex')
    const tokenHash = await bcrypt.hash(rawToken, 10)

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      },
    })

    console.log(
      `RESET LINK: ${process.env.NEXT_PUBLIC_APP_URL}/reset-password/${rawToken}`
    )
  }

  return NextResponse.json({ message: 'OK' })
}