import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcrypt'
import { getValidatedSession } from '@/lib/auth'

export async function POST(req: Request) {
  const session = await getValidatedSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { password } = await req.json()

  if (!password || password.length < 8) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 400 })
  }

  const passwordHash = await bcrypt.hash(password, 12)

  await prisma.user.update({
    where: { id: session.userId },
    data: { passwordHash },
  })

  return NextResponse.json({ success: true })
}