'use server'

import { prisma } from '@/lib/prisma'
import { hashPassword, setSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { validPassword, PASSWORD_ERROR } from '@/lib/password-policy'
import { allowAttempt } from '@/lib/rate-limit'
import { clearSession } from '@/lib/auth'

export async function signup(
  prevState: { error?: string } | null,
  formData: FormData
) {
  const fullName = formData.get('fullName') as string
  const email = (formData.get('email') as string)?.trim().toLowerCase()
  const password = formData.get('password') as string

  if (!fullName || !email || !password) {
    return { error: 'Todos los campos son requeridos.' }
  }

  if (!validPassword(password)) return { error: PASSWORD_ERROR }
  if (!await allowAttempt('signup', email, 3)) return { error: 'Intente más tarde.' }

  const existingUser = await prisma.user.findUnique({
    where: { email },
  })

  if (existingUser) {
    return { error: 'Ya existe una cuenta con ese email.' }
  }

  const passwordHash = await hashPassword(password)

  const user = await prisma.user.create({
    data: {
      fullName,
      email,
      passwordHash,
    },
  })

  await clearSession()

  // 🟢 CREAR sesión nueva
  await setSession(user.id)

  // 🚀 continuar flujo normal
  redirect('/signup/success')
}