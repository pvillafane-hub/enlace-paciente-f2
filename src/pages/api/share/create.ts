import type { NextApiRequest, NextApiResponse } from 'next'
import crypto from 'crypto'

let prisma: any

async function getPrisma() {
  if (!prisma) {
    const { PrismaClient } = await import('@prisma/client')
    prisma = new PrismaClient()
  }
  return prisma
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const db = await getPrisma()

    const { documentId, days } = req.body

    // 🔐 1️⃣ Validar sesión
    const sessionId = req.cookies.pp_session

    if (!sessionId) {
      return res.status(401).json({ error: 'Unauthorized - No session' })
    }

    const session = await db.session.findUnique({
      where: { id: sessionId },
    })

    if (!session || session.expiresAt < new Date()) {
      return res.status(401).json({ error: 'Invalid or expired session' })
    }

    const userId = session.userId

    // 📄 2️⃣ Validar que el documento pertenezca al usuario
    const doc = await db.document.findFirst({
      where: {
        id: documentId,
        userId,
      },
    })

    if (!doc) {
      return res.status(400).json({ error: 'Documento no válido.' })
    }

    // 🔗 3️⃣ Crear token
    const token = crypto.randomUUID()

    const expiresAt = new Date(
      Date.now() + (days || 1) * 24 * 60 * 60 * 1000
    )

    await db.shareLink.create({
      data: {
        documentId,
        token,
        expiresAt,
      },
    })

    return res.status(200).json({ token })

  } catch (err) {
    console.error('SHARE CREATE ERROR:', err)
    return res.status(500).json({ error: 'Internal error' })
  }
}