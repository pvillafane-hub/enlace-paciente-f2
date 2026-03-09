'use server'

import { prisma } from '@/lib/prisma'
import { hashPassword, setSession } from '@/lib/auth'
import { redirect } from 'next/navigation'

export async function signup(
  prevState: { error?: string } | null,
  formData: FormData
) {
  const fullName = formData.get('fullName') as string
  const email = (formData.get('email') as string)?.toLowerCase()
  const password = formData.get('password') as string

  if (!fullName || !email || !password) {
    return { error: 'Todos los campos son requeridos.' }
  }

  // reglas de password
  if (
    password.length < 8 ||
    !/[A-Z]/.test(password) ||
    !/[a-z]/.test(password) ||
    !/[0-9]/.test(password) ||
    !/[^A-Za-z0-9]/.test(password)
  ) {
    return {
      error:
        'La contraseña debe tener al menos 8 caracteres, mayúscula, minúscula, número y símbolo.',
    }
  }

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

  setSession(user.id)
  redirect('/signup/success')

}
