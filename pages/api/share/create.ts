import { getApiSession } from '@/lib/api-auth'
import type { NextApiRequest, NextApiResponse } from 'next'
import crypto from 'crypto'

import { prisma } from '@/lib/prisma'
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const db = prisma

    const { documentId, days = 1 } = req.body ?? {}
    if (typeof documentId !== 'string' || !Number.isInteger(days) || days < 1 || days > 7) return res.status(400).json({ error: 'Seleccione de 1 a 7 días' })

    // 🔐 1️⃣ Validar sesión
    const sessionId = req.cookies.pp_session

    if (!sessionId) {
      return res.status(401).json({ error: 'Unauthorized - No session' })
    }

    const session = await getApiSession(sessionId)

    if (!session || session.expiresAt < new Date()) {
      return res.status(401).json({ error: 'Invalid or expired session' })
    }

    const userId = session.userId

    // 📄 2️⃣ Validar que el documento pertenezca al usuario
    const doc = await db.document.findFirst({
      where: {
        id: documentId,
        userId,
        deletedAt: null,
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

    await db.$transaction(async tx => {
    // Lock the document so deletion cannot race with link creation.
    await tx.$queryRaw`SELECT "id" FROM "Document" WHERE "id" = ${documentId} FOR UPDATE`
    const current = await tx.document.findFirst({ where: { id: documentId, userId, deletedAt: null } })
    if (!current) throw new Error("Document unavailable")
    await tx.shareLink.create({
      data: {
        documentId,
        token,
        expiresAt,
      },
    })

    await tx.auditLog.create({ data: { userId, action: 'DOCUMENT_SHARED', entityId: documentId } })
    })

    return res.status(200).json({ token })

  } catch (err) {
    console.error('SHARE CREATE ERROR:', err)
    return res.status(500).json({ error: 'Internal error' })
  }
}