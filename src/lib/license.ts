import { prisma } from '@/lib/prisma'
export { hasActiveLicense, isPro } from '@/lib/license-policy'
export async function getUserLicense(userId: string) {
  if (!userId) return null
  return prisma.license.findFirst({ where: { userId, status: 'ACTIVE', OR: [{ validUntil: null }, { validUntil: { gt: new Date() } }] }, orderBy: { createdAt: 'desc' } })
}
