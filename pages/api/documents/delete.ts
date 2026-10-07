import { getApiSession } from '@/lib/api-auth'
import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {

    const { documentId } = req.body

    if (!documentId) {
      return res.status(400).json({ error: 'Document ID required' })
    }

    const sessionId = req.cookies.pp_session

    if (!sessionId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const session = await getApiSession(sessionId)

    if (!session || session.expiresAt < new Date()) {
      return res.status(401).json({ error: 'Invalid session' })
    }

    const document = await prisma.document.findUnique({
      where: { id: documentId },
    })

    if (!document || document.userId !== session.userId) {
      return res.status(404).json({ error: 'Document not found' })
    }

    await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT "id" FROM "Document" WHERE "id" = ${documentId} FOR UPDATE`
      await tx.document.updateMany({ where: { id: documentId, userId: session.userId, deletedAt: null }, data: { deletedAt: new Date() } })
      await tx.shareLink.deleteMany({ where: { documentId } })
      await tx.auditLog.create({ data: { userId: session.userId, action: 'DOCUMENT_DELETED', entityId: documentId } })
    })

    return res.status(200).json({ ok: true })

  } catch (error) {

    console.error('DELETE DOCUMENT ERROR:', error)

    return res.status(500).json({ error: 'Internal Server Error' })

  }
}