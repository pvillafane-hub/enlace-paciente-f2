import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcrypt'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).end()
  }

  const { token, password } = req.body

  if (!token || !password) {
    return res.status(400).end()
  }

  const resetTokens = await prisma.passwordResetToken.findMany({
    where: {
      used: false,
      expiresAt: { gt: new Date() },
    },
    include: { user: true },
  })

  let matchedToken = null

  for (const t of resetTokens) {
    const isMatch = await bcrypt.compare(token, t.tokenHash)
    if (isMatch) {
      matchedToken = t
      break
    }
  }

  if (!matchedToken) {
    return res.status(400).json({ error: 'Token inválido o expirado' })
  }

  const hashedPassword = await bcrypt.hash(password, 12)

  await prisma.user.update({
    where: { id: matchedToken.userId },
    data: { passwordHash: hashedPassword }, // ✅ CORRECTO
   })

  await prisma.passwordResetToken.update({
    where: { id: matchedToken.id },
    data: { used: true },
  })

  return res.status(200).json({ message: 'Password updated' })
}