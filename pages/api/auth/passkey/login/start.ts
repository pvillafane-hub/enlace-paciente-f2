import type { NextApiRequest, NextApiResponse } from 'next'
import { generateAuthenticationOptions } from '@simplewebauthn/server'
import { prisma } from '@/lib/prisma'
import { webauthnConfig } from '@/config/webauthn'
import { allowAttempt } from '@/lib/rate-limit'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  if (!await allowAttempt('passkey-start', String(req.headers['x-forwarded-for'] || req.socket.remoteAddress), 20)) return res.status(429).json({ error: 'Intente más tarde' })
  try {
    const { rpID } = webauthnConfig()
    const options = await generateAuthenticationOptions({ rpID, userVerification: 'required' })
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000)
    const temp = await prisma.session.create({ data: { challenge: options.challenge, expiresAt, challengeExpiresAt: expiresAt } })
    res.setHeader('Set-Cookie', `pp_session=${temp.id}; Path=/; HttpOnly; Max-Age=300; ${process.env.NODE_ENV === 'production' ? 'Secure;' : ''} SameSite=Lax`)
    return res.status(200).json(options)
  } catch { console.error('PASSKEY_START_FAILED'); return res.status(500).json({ error: 'No disponible' }) }
}
