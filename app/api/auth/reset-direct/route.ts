import { NextResponse } from 'next/server'
import { getValidatedSession } from '@/lib/auth'
import { changeOwnPassword } from '@/lib/password-change'
import { allowAttempt } from '@/lib/rate-limit'

export async function POST(req: Request) {
  const session = await getValidatedSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!await allowAttempt('change-password', session.userId)) return NextResponse.json({ error: 'Intente más tarde' }, { status: 429 })
  const { currentPassword, password } = await req.json()
  try {
    await changeOwnPassword(session.userId, currentPassword, password)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Verifique la contraseña actual y los requisitos de la nueva contraseña.' }, { status: 400 })
  }
}
