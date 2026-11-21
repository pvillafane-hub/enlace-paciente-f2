import { prisma } from '@/lib/prisma'

/** Only a verified, unexpired parent/guardian relationship for a minor grants proxy document access.
 * Adult representation needs a separate verified legal-authority workflow; deny by default.
 */
export async function getAuthorizedMinorProxy(guardianId: string, patientId: string) {
  const now = new Date()
  const link = await prisma.guardianLink.findFirst({
    where: {
      guardianId, patientId, status: 'ACTIVE',
      reviewedAt: { not: null }, validUntil: { gt: now },
      guardian: { active: true, role: 'PATIENT' },
      patient: { active: true, role: 'PATIENT', dateOfBirth: { not: null } },
    },
    include: { patient: { select: { id: true, fullName: true, dateOfBirth: true } } },
  })
  if (!link?.patient.dateOfBirth) return null
  const birth = link.patient.dateOfBirth
  const age = now.getUTCFullYear() - birth.getUTCFullYear() -
    (now.getUTCMonth() < birth.getUTCMonth() ||
    (now.getUTCMonth() === birth.getUTCMonth() && now.getUTCDate() < birth.getUTCDate()) ? 1 : 0)
  return age >= 0 && age < 18 ? link : null
}
