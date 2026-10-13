import { prisma } from '@/lib/prisma'
import type { User } from '@prisma/client'
import { canReadPatient } from '@/lib/access'
type Actor = Pick<User, 'id' | 'role' | 'active'>
export async function activeGuardian(actor: Actor, patientId: string) {
  if (!actor.active || actor.role !== 'PATIENT' || actor.id === patientId) return null
  return prisma.guardianLink.findFirst({ where: { guardianId: actor.id, patientId, status: 'ACTIVE', validUntil: { gt: new Date() }, patient: { active: true, role: 'PATIENT' }, guardian: { active: true, role: 'PATIENT' } }, select: { id: true, canUpload: true } })
}
export async function canReadDocument(actor: Actor, document: { userId: string; proxyVisible: boolean; deletedAt: Date | null }) {
  if (document.deletedAt) return false
  if (await canReadPatient(actor, document.userId)) return true
  return document.proxyVisible && Boolean(await activeGuardian(actor, document.userId))
}
export async function canUploadPatient(actor: Actor, patientId: string) {
  if (await canReadPatient(actor, patientId)) return true
  return Boolean((await activeGuardian(actor, patientId))?.canUpload)
}
