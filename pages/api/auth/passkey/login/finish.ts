import type { NextApiRequest, NextApiResponse } from 'next'
import { verifyAuthenticationResponse } from '@simplewebauthn/server'
import { prisma } from '@/lib/prisma'
import { webauthnConfig } from '@/config/webauthn'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  const id = req.cookies.pp_session
  if (!id || typeof req.body?.id !== 'string') return res.status(401).json({ error: 'Unauthorized' })
  try {
    const session = await prisma.session.findUnique({ where: { id } })
    if (!session || session.userId || !session.challenge || !session.challengeExpiresAt || session.challengeExpiresAt <= new Date() || session.expiresAt <= new Date()) return res.status(400).json({ error: 'Challenge expired' })
    const method = await prisma.authMethod.findUnique({ where: { credentialId: req.body.id }, include: { user: true } })
    if (!method?.user.active || (method.user.passwordChangedAt && method.user.passwordChangedAt >= session.createdAt)) return res.status(401).json({ error: 'Unauthorized' })
    const { origin, rpID } = webauthnConfig()
    const verification = await verifyAuthenticationResponse({ response: req.body, expectedChallenge: session.challenge, expectedOrigin: origin, expectedRPID: rpID, requireUserVerification: true, credential: { id: method.credentialId, publicKey: Buffer.from(method.publicKey, 'base64'), counter: method.counter } })
    if (!verification.verified) return res.status(400).json({ error: 'Verification failed' })
    const newSession = await prisma.$transaction(async tx => {
      const consumed = await tx.session.deleteMany({ where: { id, challenge: session.challenge, expiresAt: { gt: new Date() }, challengeExpiresAt: { gt: new Date() } } })
      if (consumed.count !== 1) throw new Error('Challenge consumed')
      if (!await tx.user.findFirst({ where: { id: method.userId, active: true, OR: [{ passwordChangedAt: null }, { passwordChangedAt: { lt: session.createdAt } }] }, select: { id: true } })) throw new Error('User unavailable')
      const updated = await tx.authMethod.updateMany({ where: { id: method.id, counter: method.counter }, data: { counter: verification.authenticationInfo.newCounter, lastUsedAt: new Date() } })
      if (updated.count !== 1) throw new Error('Credential changed')
      const created = await tx.session.create({ data: { userId: method.userId, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) } })
      await tx.auditLog.create({ data: { userId: method.userId, action: 'PASSKEY_LOGIN' } })
      return created
    })
    res.setHeader('Set-Cookie', `pp_session=${newSession.id}; Path=/; HttpOnly; Max-Age=604800; ${process.env.NODE_ENV === 'production' ? 'Secure;' : ''} SameSite=Lax`)
    return res.status(200).json({ ok: true })
  } catch { console.error('PASSKEY_LOGIN_FAILED'); return res.status(400).json({ error: 'No se pudo verificar la passkey' }) }
}
