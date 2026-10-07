import bcrypt from 'bcrypt'
import { prisma } from '@/lib/prisma'
import { validPassword, PASSWORD_ERROR } from '@/lib/password-policy'

export async function changeOwnPassword(userId: string, currentPassword: unknown, password: unknown) {
  if (!validPassword(password)) throw new Error(PASSWORD_ERROR)
  if (typeof currentPassword !== 'string' || new TextEncoder().encode(currentPassword).length > 72) throw new Error('Contraseña actual requerida')
  const user = await prisma.user.findFirst({ where: { id: userId, active: true } })
  if (!user || !await bcrypt.compare(currentPassword, user.passwordHash)) throw new Error('Contraseña actual incorrecta')
  const passwordHash = await bcrypt.hash(password, 12)
  await prisma.$transaction(async tx => {
    const changed = await tx.user.updateMany({ where: { id: userId, active: true, passwordHash: user.passwordHash }, data: { passwordHash, passwordChangedAt: new Date() } })
    if (changed.count !== 1) throw new Error('La cuenta cambió; vuelva a iniciar sesión')
    await tx.session.deleteMany({ where: { userId } })
    await tx.passwordResetToken.updateMany({ where: { userId, used: false }, data: { used: true } })
    await tx.auditLog.create({ data: { userId, action: 'PASSWORD_CHANGED' } })
  })
}
