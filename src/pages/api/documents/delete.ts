import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { s3 } from '@/lib/s3'
import { DeleteObjectCommand } from '@aws-sdk/client-s3'

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

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    })

    if (!session || session.expiresAt < new Date()) {
      return res.status(401).json({ error: 'Invalid session' })
    }

    const document = await prisma.document.findUnique({
      where: { id: documentId },
    })

    if (!document || document.userId !== session.userId) {
      return res.status(404).json({ error: 'Document not found' })
    }

    // 🗑 Eliminar archivo en S3
    await s3.send(
      new DeleteObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME!,
        Key: document.filePath,
      })
    )
       
    // 🧹 Eliminar enlaces compartidos asociados
    await prisma.shareLink.deleteMany({
       where: { documentId },
    })

    // 🗑 Eliminar registro en DB
    await prisma.document.delete({
      where: { id: documentId },
    })

    return res.status(200).json({ ok: true })

  } catch (error) {
    console.error('DELETE DOCUMENT ERROR:', error)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}