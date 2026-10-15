'use server'

import { prisma } from '@/lib/prisma'
import { hashPassword, setSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { validPassword, PASSWORD_ERROR } from '@/lib/password-policy'
import { allowAttempt } from '@/lib/rate-limit'
import { clearSession } from '@/lib/auth'
import { identityCandidates } from '@/lib/identity-registration'
import { normalizedPhone } from '@/lib/identity-policy'
import { validDateOnly } from '@/lib/file-policy'

export async function signup(
  prevState: { error?: string } | null,
  formData: FormData
) {
  const fullName = formData.get('fullName') as string
  const email = (formData.get('email') as string)?.trim().toLowerCase()
  const birth = String(formData.get('dateOfBirth') || '')
  const phone = normalizedPhone(String(formData.get('contactPhone') || ''))
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Puerto_Rico' }).format(new Date())
  if (!validDateOnly(birth) || birth < '1850-01-01' || birth > today || !/^[0-9]{10,15}$/.test(phone)) return { error: 'Verifica la fecha de nacimiento y el teléfono de contacto.' }
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

  let user
  try {
    user = await prisma.$transaction(async tx => {
      const candidateIds = await identityCandidates(tx, fullName, new Date(birth), phone)
      const held = candidateIds.length > 0
      const created = await tx.user.create({ data: { fullName, email, passwordHash, dateOfBirth: new Date(birth), contactPhone: phone, active: !held, identityStatus: held ? 'HOLD' : 'CLEAR' } })
      if (held) {
        await tx.identityReview.create({ data: { userId: created.id, candidateIds } })
        await tx.auditLog.create({ data: { userId: created.id, action: 'IDENTITY_REVIEW_REQUESTED', entityId: created.id, metadata: { source: 'signup', candidateCount: candidateIds.length } } })
      }
      return created
    }, { isolationLevel: 'Serializable' })
  } catch { return { error: 'No se pudo completar el registro. Intenta nuevamente o contacta al administrador.' } }
  if (user.identityStatus === 'HOLD') { await clearSession(); redirect('/signup/pending') }

  await clearSession()

  // 🟢 CREAR sesión nueva
  await setSession(user.id)

  // 🚀 continuar flujo normal
  redirect('/signup/success')
}