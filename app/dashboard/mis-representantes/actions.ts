'use server'
import { prisma } from '@/lib/prisma'
import { getValidatedSession } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function decideProxyConsent(linkId: string, decision: 'APPROVE' | 'REVOKE') {
  const session = await getValidatedSession()
  if (!session?.userId) throw new Error('Sesión requerida')
  if (!['APPROVE', 'REVOKE'].includes(decision)) throw new Error('Decisión inválida')
  await prisma.$transaction(async tx => {
    const patient = await tx.user.findUnique({ where: { id: session.userId }, select: { role: true, active: true } })
    if (!patient?.active || patient.role !== 'PATIENT') throw new Error('No autorizado')
    const link = await tx.guardianLink.findFirst({ where: { id: linkId, patientId: session.userId },
      include: { guardian: { select: { active: true } } } })
    if (!link) throw new Error('Vínculo no encontrado')
    if (decision === 'APPROVE') {
      if (link.status !== 'ACTIVE' || !link.reviewedAt || !link.guardian.active ||
          (link.validUntil && link.validUntil <= new Date())) throw new Error('Vínculo no verificado o vencido')
      await tx.auditLog.create({ data: { userId: session.userId, action: 'PATIENT_PROXY_CONSENT_GRANTED',
        entityId: link.id, metadata: { guardianId: link.guardianId, patientId: session.userId } } })
    } else {
      const result = await tx.guardianLink.updateMany({ where: { id: linkId, patientId: session.userId, status: { not: 'REVOKED' } },
        data: { status: 'REVOKED', canUpload: false } })
      if (result.count) await tx.auditLog.create({ data: { userId: session.userId, action: 'PATIENT_PROXY_ACCESS_REVOKED',
        entityId: link.id, metadata: { guardianId: link.guardianId, patientId: session.userId } } })
    }
  }, { isolationLevel: 'Serializable' })
  revalidatePath('/dashboard/mis-representantes')
  revalidatePath('/dashboard/representados')
}
