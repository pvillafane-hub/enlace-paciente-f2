import { prisma } from '@/lib/prisma'
import type { ReceiptStore } from './intake'
export const receiptStore: ReceiptStore = {
  list: source => prisma.interopSandboxReceipt.findMany({ where: { source }, orderBy: { createdAt: 'desc' }, take: 50, select: { id: true, reportId: true, status: true, normalized: true, createdAt: true } }),
  find: (source, reportId) => prisma.interopSandboxReceipt.findUnique({ where: { source_reportId: { source, reportId } } }),
  create: input => prisma.interopSandboxReceipt.create({ data: { ...input, normalized: { ...input.normalized }, events: { create: { action: 'RECEIVED_' + input.status } } } }),
  event: async (receiptId, action) => { await prisma.interopSandboxEvent.create({ data: { receiptId, action } }) },
}
