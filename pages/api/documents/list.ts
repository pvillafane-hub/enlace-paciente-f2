import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const sessionId = req.cookies.pp_session

    if (!sessionId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    })

    // ✅ FIX CRÍTICO
    if (!session || session.expiresAt < new Date() || !session.userId) {
      return res.status(401).json({ error: 'Invalid session' })
    }

    const userId = session.userId

    const documents = await prisma.document.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })

    return res.status(200).json(documents)

  } catch (err) {
    console.error('LIST DOCUMENTS ERROR:', err)
    return res.status(500).json({ error: 'Internal error' })
  }
}