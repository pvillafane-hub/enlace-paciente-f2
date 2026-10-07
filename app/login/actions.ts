'use server'

import { prisma } from '@/lib/prisma'
import { verifyPassword, setSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { allowAttempt } from '@/lib/rate-limit'
import { auditLog } from '@/lib/audit'

export async function login(
  prevState: { error?: string } | null,
  formData: FormData
) {
  const email = (formData.get('email') as string)?.trim().toLowerCase()
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Email y contraseña son requeridos.' }
  }

  if (new TextEncoder().encode(password).length > 72 || !await allowAttempt('login', email)) return { error: 'No se puede iniciar sesión; intente más tarde.' }

  const user = await prisma.user.findUnique({ where: { email } })

  if (!user) {
    return { error: 'Email o contraseña incorrectos.' }
  }

  // 🔥 NUEVO: BLOQUEO POR USUARIO INACTIVO
  if (!user.active) {
    return {
      error: 'Tu cuenta ha sido desactivada. Contacta al administrador.'
    }
  }

  const ok = await verifyPassword(password, user.passwordHash)

  if (!ok) {
    return { error: 'Email o contraseña incorrectos.' }
  }

  await setSession(user.id)

  await auditLog({
    userId: user.id,
    action: 'LOGIN',
  })

  redirect('/dashboard')
}