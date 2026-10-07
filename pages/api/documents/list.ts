import { getApiSession } from '@/lib/api-auth'
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

    const session = await getApiSession(sessionId)

    // ✅ FIX CRÍTICO
    if (!session || session.expiresAt < new Date() || !session.userId) {
      return res.status(401).json({ error: 'Invalid session' })
    }

    const userId = session.userId

    const limit = req.query.limit === undefined ? 50 : Number(req.query.limit)
    const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : undefined
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) return res.status(400).json({ error: 'Limit inválido' })
    if (cursor && !await prisma.document.findFirst({ where: { id: cursor, userId, deletedAt: null }, select: { id: true } })) return res.status(400).json({ error: 'Cursor inválido' })
    const documents = await prisma.document.findMany({
      where: { userId, deletedAt: null },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    })

    const hasMore = documents.length > limit
    const page = documents.slice(0, limit)
    if (hasMore) res.setHeader('X-Next-Cursor', page[page.length - 1].id)
    res.setHeader('Cache-Control', 'private, no-store')
    return res.status(200).json(page)

  } catch (err) {
    console.error('LIST DOCUMENTS ERROR:', err)
    return res.status(500).json({ error: 'Internal error' })
  }
}