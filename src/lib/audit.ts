import { prisma } from '@/lib/prisma'

export async function auditLog({
  userId,
  action,
  entityId,
  metadata,
}: {
  userId: string
  action: string
  entityId?: string
  metadata?: any
}) {
  await prisma.auditLog.create({
    data: {
      userId,
      action,
      entityId,
      metadata,
    },
  })
}
