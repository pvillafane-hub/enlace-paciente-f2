import { prisma } from '@/lib/prisma'

/** Recheck every document request; family relationship alone never grants adult access. */
export async function getAuthorizedProxy(guardianId: string, patientId: string) {
  const now = new Date()
  const link = await prisma.guardianLink.findFirst({
    where: {
      guardianId, patientId, status: 'ACTIVE', reviewedAt: { not: null },
      OR: [{ validUntil: null }, { validUntil: { gt: now } }],
      guardian: { active: true, role: 'PATIENT' },
      patient: { active: true, role: 'PATIENT', dateOfBirth: { not: null } },
    },
    include: { patient: { select: { dateOfBirth: true } } },
  })
  if (!link?.patient.dateOfBirth || !link.reviewedAt) return null
  const birth = link.patient.dateOfBirth
  const age = now.getUTCFullYear() - birth.getUTCFullYear() -
    (now.getUTCMonth() < birth.getUTCMonth() ||
      (now.getUTCMonth() === birth.getUTCMonth() && now.getUTCDate() < birth.getUTCDate()) ? 1 : 0)
  if (age < 0) return null
  // Puerto Rico's general age of majority is 21. Require explicit consent at adulthood.
  if (age >= 21) {
    const consent = await prisma.auditLog.findFirst({
      where: { userId: patientId, action: 'PATIENT_PROXY_CONSENT_GRANTED', entityId: link.id,
        createdAt: { gte: link.reviewedAt } },
      select: { id: true },
    })
    if (!consent) return null
  }
  return link
}
