import { prisma } from '@/lib/prisma'
import { isSessionUsable } from '@/lib/session-policy'

export async function getApiSession(sessionId: string | undefined) {
  if (!sessionId) return null
  const session = await prisma.session.findUnique({
    where: { id: sessionId }, include: { user: true },
  })
  if (!session || !session.userId || !session.user || !isSessionUsable(session, session.user)) return null
  return { ...session, userId: session.userId, user: session.user }
}
