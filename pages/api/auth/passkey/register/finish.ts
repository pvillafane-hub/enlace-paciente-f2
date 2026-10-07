import type { NextApiRequest, NextApiResponse } from 'next'
import { verifyRegistrationResponse } from '@simplewebauthn/server'
import { prisma } from '@/lib/prisma'
import { getApiSession } from '@/lib/api-auth'
import { webauthnConfig } from '@/config/webauthn'
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  const session = await getApiSession(req.cookies.pp_session)
  if (!session || !session.challenge || !session.challengeExpiresAt || session.challengeExpiresAt <= new Date()) return res.status(401).json({ error: 'Challenge expired' })
  try {
    const { origin, rpID } = webauthnConfig()
    const result = await verifyRegistrationResponse({ response: req.body, expectedChallenge: session.challenge, expectedOrigin: origin, expectedRPID: rpID, requireUserVerification: true })
    if (!result.verified || !result.registrationInfo) return res.status(400).json({ error: 'Verification failed' })
    const { credential } = result.registrationInfo
    await prisma.$transaction(async tx => {
      const consumed = await tx.session.updateMany({ where: { id: session.id, challenge: session.challenge, challengeExpiresAt: { gt: new Date() }, expiresAt: { gt: new Date() }, user: { active: true } }, data: { challenge: null, challengeExpiresAt: null } })
      if (consumed.count !== 1) throw new Error('Challenge consumed')
      await tx.authMethod.create({ data: { userId: session.userId, type: 'passkey', credentialId: credential.id, publicKey: Buffer.from(credential.publicKey).toString('base64'), counter: credential.counter } })
      await tx.auditLog.create({ data: { userId: session.userId, action: 'PASSKEY_REGISTERED' } })
    })
    return res.status(200).json({ verified: true })
  } catch { console.error('PASSKEY_REGISTER_FAILED'); return res.status(400).json({ error: 'No se pudo registrar la passkey' }) }
}
