'use server'

import { prisma } from '@/lib/prisma'
import { verifyPassword, setSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { auditLog } from '@/lib/audit'


export async function login(
  prevState: { error?: string } | null,
  formData: FormData
) {
  const email = (formData.get('email') as string)?.toLowerCase()
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Email y contraseña son requeridos.' }
  }

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    return { error: 'Email o contraseña incorrectos.' }
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

