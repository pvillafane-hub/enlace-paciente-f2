import { getValidatedSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { changeOwnPassword } from '@/lib/password-change'
import { allowAttempt } from '@/lib/rate-limit'
import ChangePasswordForm from './ChangePasswordForm'

export default async function ChangePasswordPage() {
  if (!await getValidatedSession()) redirect('/login')
  async function changePassword(_state: { error?: string; success?: string }, formData: FormData) {
    'use server'
    const session = await getValidatedSession()
    if (!session) return { error: 'Inicie sesión nuevamente.' }
    if (!await allowAttempt('change-password', session.userId)) return { error: 'Intente más tarde.' }
    if (formData.get('newPassword') !== formData.get('confirmPassword')) return { error: 'Las contraseñas no coinciden.' }
    try { await changeOwnPassword(session.userId, formData.get('currentPassword'), formData.get('newPassword')) }
    catch { return { error: 'Verifique su contraseña actual y los requisitos de la nueva contraseña.' } }
    redirect('/login?password=changed')
  }
  return <ChangePasswordForm action={changePassword} />
}
