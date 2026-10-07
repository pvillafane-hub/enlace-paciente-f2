import type { NextApiRequest, NextApiResponse } from 'next'
import { generateRegistrationOptions } from '@simplewebauthn/server'
import { prisma } from '@/lib/prisma'
import { getApiSession } from '@/lib/api-auth'
import { webauthnConfig } from '@/config/webauthn'
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  const session = await getApiSession(req.cookies.pp_session)
  if (!session) return res.status(401).json({ error: 'Unauthorized' })
  const { rpID, rpName } = webauthnConfig()
  const methods = await prisma.authMethod.findMany({ where: { userId: session.userId }, select: { credentialId: true } })
  const options = await generateRegistrationOptions({ rpID, rpName, userID: new TextEncoder().encode(session.userId), userName: session.user.email, attestationType: 'none', excludeCredentials: methods.map(m => ({ id: m.credentialId })), authenticatorSelection: { residentKey: 'required', userVerification: 'required' } })
  await prisma.session.update({ where: { id: session.id }, data: { challenge: options.challenge, challengeExpiresAt: new Date(Date.now() + 5 * 60 * 1000) } })
  return res.status(200).json(options)
}
