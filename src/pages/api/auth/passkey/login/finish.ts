import { prisma } from '@/lib/prisma'

import type { NextApiRequest, NextApiResponse } from 'next'
import { verifyAuthenticationResponse } from '@simplewebauthn/server'


export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const db = prisma

    const body = req.body
    const expectedChallenge = req.cookies.passkey_challenge

    if (!expectedChallenge) {
      return res.status(400).json({ error: 'Challenge missing' })
    }

    const method = await db.authMethod.findFirst({
      where: { credentialId: body.id },
    })

    if (!method) {
      return res.status(400).json({ error: 'Passkey not found' })
    }

    const origin = `https://${req.headers.host}`
    const rpID = req.headers.host as string

    const verification = await verifyAuthenticationResponse({
      response: body,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: {
        id: method.credentialId,
        publicKey: Buffer.from(method.publicKey, 'base64'),
        counter: method.counter,
      },
    })

    if (!verification.verified) {
     return res.status(400).json({ error: 'Verification failed' })
    }

    // Actualizar contador del método
    await db.authMethod.update({
      where: { id: method.id },
      data: {
        counter: verification.authenticationInfo.newCounter,
        lastUsedAt: new Date(),
      },
    })
    
    // 🔐 CREAR SESIÓN EN DB
    const session = await db.session.create({
      data: {
        userId: method.userId,
        expiresAt: new Date(
         Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 días
        ),
      },
    })

    // 🍪 SETEAR COOKIES CORRECTAMENTE
    res.setHeader('Set-Cookie', [
      `pp_session=${session.id}; Path=/; HttpOnly; Secure; SameSite=Lax`,
      `passkey_challenge=; Path=/; Expires=${new Date(0).toUTCString()}`,
    ])

return res.status(200).json({ ok: true })   
  } catch (err) {
    console.error('LOGIN FINISH ERROR:', err)
    return res.status(500).json({ error: 'Internal error' })
  }
}
