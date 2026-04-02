import { prisma } from '@/lib/prisma'

import type { NextApiRequest, NextApiResponse } from 'next'
import { verifyAuthenticationResponse } from '@simplewebauthn/server'

// 🔥 helper fuera del handler (evita error ES5)
const base64urlToBase64 = (base64url: string) => {
  return base64url
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(Math.ceil(base64url.length / 4) * 4, '=')
}

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

    console.log("🟡 BODY RECEIVED:", JSON.stringify(body, null, 2))

    // 🔐 Obtener sesión
    const sessionId = req.cookies.pp_session
    console.log("🟡 SESSION ID:", sessionId)

    if (!sessionId) {
      return res.status(401).json({ error: 'No session' })
    }

    const session = await db.session.findUnique({
      where: { id: sessionId },
    })

    console.log("🟡 SESSION DB:", session)

    if (!session || !session.challenge) {
      return res.status(400).json({ error: 'Challenge missing' })
    }

    const expectedChallenge = session.challenge
    console.log("🟡 EXPECTED CHALLENGE:", expectedChallenge)

    // 🔥 Normalizar ID
    const normalizedId = base64urlToBase64(body.id)

    console.log("🟡 ORIGINAL ID:", body.id)
    console.log("🟡 NORMALIZED ID:", normalizedId)

    // 🔥 BUSCAR DE DOS FORMAS (CLAVE)
    let method = await db.authMethod.findFirst({
      where: {
        credentialId: body.id,
      },
    })

    if (!method) {
      method = await db.authMethod.findFirst({
        where: {
          credentialId: normalizedId,
        },
      })
    }

    console.log("🟡 MATCHED METHOD:", method)

    if (!method) {
      console.warn("⚠️ Passkey no registrada en el sistema")

      return res.status(400).json({
        error: 'Esta passkey no está registrada. Activa Entrar Fácil primero.',
      })
    }

    // 🔥 FIX REAL (PROD vs LOCAL)
    const isProd = process.env.NODE_ENV === 'production'

    const origin = isProd
      ? 'https://enlace-salud-seven.vercel.app'
      : 'http://localhost:3000'

    const rpID = isProd
      ? 'enlace-salud-seven.vercel.app'
      : 'localhost'

    console.log("🟡 ORIGIN:", origin)
    console.log("🟡 RP ID:", rpID)

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

    console.log("🟡 VERIFICATION RESULT:", verification)

    if (!verification.verified) {
      console.error("❌ VERIFICATION FAILED FULL:", verification)
      return res.status(400).json({
        error: 'Verification failed',
        verification,
      })
    }

    // 🔐 Limpiar challenge
    await db.session.update({
      where: { id: session.id },
      data: {
        challenge: null,
      },
    })

    // 🔁 actualizar contador
    await db.authMethod.update({
      where: { id: method.id },
      data: {
        counter: verification.authenticationInfo.newCounter,
        lastUsedAt: new Date(),
      },
    })

    // 🔐 nueva sesión
    const newSession = await db.session.create({
      data: {
        userId: method.userId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    })

    const isProdCookie = process.env.NODE_ENV === 'production'

    res.setHeader('Set-Cookie', [
      `pp_session=${newSession.id}; Path=/; HttpOnly; ${
        isProdCookie ? 'Secure;' : ''
      } SameSite=Lax`,
    ])

    return res.status(200).json({ ok: true })

  } catch (err) {
    console.error('🔥 LOGIN FINISH ERROR FULL:', err)
    return res.status(500).json({ error: 'Internal error' })
  }
}