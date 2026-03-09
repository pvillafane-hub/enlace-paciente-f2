import { getValidatedSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcrypt'
import { revalidatePath } from 'next/cache'
import ChangePasswordForm from './ChangePasswordForm'

export default async function ChangePasswordPage() {

  const session = await getValidatedSession()

  if (!session) {
    redirect('/?auth=required')
  }

  const userId = session.userId

  async function changePassword(
    prevState: any,
    formData: FormData
  ) {
    'use server'

    const currentPassword = String(formData.get('currentPassword') || '')
    const newPassword = String(formData.get('newPassword') || '')
    const confirmPassword = String(formData.get('confirmPassword') || '')

    // Validaciones básicas
    if (!currentPassword || !newPassword || !confirmPassword) {
      return { error: 'Debe completar todos los campos.' }
    }

    if (newPassword.length < 8) {
      return { error: 'La nueva contraseña debe tener al menos 8 caracteres.' }
    }

    if (newPassword !== confirmPassword) {
      return { error: 'Las contraseñas no coinciden.' }
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return { error: 'Usuario no encontrado.' }
    }

    const valid = await bcrypt.compare(currentPassword, user.passwordHash)

    if (!valid) {
      return { error: 'La contraseña actual no es correcta.' }
    }

    const newHash = await bcrypt.hash(newPassword, 12)

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newHash,
        passwordChangedAt: new Date(),
      },
    })

    revalidatePath('/dashboard/security')

    return { success: 'Contraseña actualizada correctamente.' }
  }

  return <ChangePasswordForm action={changePassword} />
}