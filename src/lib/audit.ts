import type { Prisma } from '@prisma/client'
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
  metadata?: Prisma.InputJsonValue
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
