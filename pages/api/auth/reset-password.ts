import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcrypt'
import { createHash } from 'node:crypto'
import { validPassword, PASSWORD_ERROR } from '@/lib/password-policy'
import { allowAttempt } from '@/lib/rate-limit'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  const { token, password } = req.body ?? {}
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token) || !validPassword(password)) return res.status(400).json({ error: PASSWORD_ERROR })
  const tokenHash = createHash('sha256').update(token).digest('hex')
  try {
    if (!await allowAttempt('reset-password', tokenHash)) return res.status(429).json({ error: 'Intente más tarde' })
    const passwordHash = await bcrypt.hash(password, 12)
    await prisma.$transaction(async tx => {
      const reset = await tx.passwordResetToken.findFirst({ where: { tokenHash, used: false, expiresAt: { gt: new Date() }, user: { active: true } } })
      if (!reset) throw new Error('Invalid token')
      const consumed = await tx.passwordResetToken.updateMany({ where: { id: reset.id, used: false, expiresAt: { gt: new Date() } }, data: { used: true } })
      if (consumed.count !== 1) throw new Error('Token consumed')
      await tx.user.update({ where: { id: reset.userId }, data: { passwordHash, passwordChangedAt: new Date() } })
      await tx.session.deleteMany({ where: { userId: reset.userId } })
      await tx.passwordResetToken.updateMany({ where: { userId: reset.userId, used: false }, data: { used: true } })
      await tx.auditLog.create({ data: { userId: reset.userId, action: 'PASSWORD_RESET' } })
    })
    return res.status(200).json({ message: 'Password updated' })
  } catch { return res.status(400).json({ error: 'Token inválido, expirado o no disponible' }) }
}
