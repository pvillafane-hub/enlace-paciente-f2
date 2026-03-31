import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcrypt'
import { getValidatedSession } from '@/lib/auth'

export async function POST(req: Request) {
  try {
    const session = await getValidatedSession()

    // 🔐 Validar sesión
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 🔥 FIX CRÍTICO (evita string | null)
    if (!session.userId) {
      return NextResponse.json(
        { error: 'Sesión inválida (sin usuario)' },
        { status: 401 }
      )
    }

    const userId = session.userId

    const { password } = await req.json()

    if (!password || password.length < 8) {
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 400 }
      )
    }

    const passwordHash = await bcrypt.hash(password, 12)

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('RESET DIRECT ERROR:', error)

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}