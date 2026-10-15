import type { Prisma } from '@prisma/client'
import { possibleIdentityMatch } from './identity-policy'
export async function identityCandidates(tx: Prisma.TransactionClient, fullName: string, dateOfBirth: Date, contactPhone: string | null) {
  // Registration transactions use Serializable so concurrent matches cannot both commit as clear.
  const candidates = await tx.user.findMany({ where: { role: 'PATIENT', dateOfBirth }, select: { id: true, fullName: true, contactPhone: true } })
  return candidates.filter(p => possibleIdentityMatch({ fullName, contactPhone }, p)).map(p => p.id)
}
