'use server'
import { prisma } from '@/lib/prisma'
import { requireActiveAdmin } from '@/lib/admin-session'
import { guardianDecision, relationships } from '@/lib/guardian-policy'
import { revalidatePath } from 'next/cache'
export type GuardianState = { error?: string; success?: string }
export async function createPendingLink(_state: GuardianState, data: FormData): Promise<GuardianState> {
  const admin = await requireActiveAdmin()
  try {
    const adultEmail = String(data.get('guardianEmail') || '').trim().toLowerCase(), patientId = String(data.get('patientId') || '')
    const relationship = String(data.get('relationship') || '')
    if (!relationships.includes(relationship as typeof relationships[number]) || !adultEmail || !patientId) throw new Error('Verifica el representante, el paciente y la relación.')
    await prisma.$transaction(async tx => {
      const guardian = await tx.user.findFirst({ where: { email: adultEmail, active: true, role: 'PATIENT' }, select: { id: true } })
      const patient = await tx.user.findFirst({ where: { id: patientId, active: true, role: 'PATIENT' }, select: { id: true } })
      if (!guardian || !patient || guardian.id === patient.id) throw new Error('Deben existir dos cuentas distintas y activas con rol Paciente.')
      if (await tx.guardianLink.findUnique({ where: { guardianId_patientId: { guardianId: guardian.id, patientId } } })) throw new Error('El vínculo ya existe. Búscalo para revisarlo.')
      const link = await tx.guardianLink.create({ data: { guardianId: guardian.id, patientId, relationship, requestedById: admin.id } })
      await tx.auditLog.create({ data: { userId: admin.id, action: 'GUARDIAN_LINK_REQUESTED', entityId: link.id, metadata: { guardianId: guardian.id, patientId, relationship, status: 'PENDING' } } })
    }, { isolationLevel: 'Serializable' })
    revalidatePath('/dashboard/admin/guardians')
    return { success: 'Vínculo pendiente registrado. Todavía no concede acceso.' }
  } catch (e) { return { error: e instanceof Error ? e.message : 'No se pudo guardar.' } }
}
export async function reviewGuardian(id: string, revision: string, _state: GuardianState, data: FormData): Promise<GuardianState> {
  const admin = await requireActiveAdmin()
  try {
    const decision = guardianDecision(data)
    await prisma.$transaction(async tx => {
      const link = await tx.guardianLink.findUnique({ where: { id }, include: { guardian: { select: { role: true, active: true } }, patient: { select: { role: true, active: true } } } })
      if (!link || link.updatedAt.toISOString() !== revision) throw new Error('El vínculo cambió. Recarga antes de continuar.')
      if (decision.status === 'ACTIVE' && (!link.guardian.active || !link.patient.active || link.guardian.role !== 'PATIENT' || link.patient.role !== 'PATIENT')) throw new Error('El representante y el paciente deben mantener cuentas activas de Paciente.')
      const changed = await tx.guardianLink.updateMany({ where: { id, updatedAt: link.updatedAt }, data: { status: decision.status, relationship: decision.relationship, canUpload: decision.canUpload, validUntil: decision.validUntil, verification: decision.reason, reviewedById: admin.id, reviewedAt: new Date() } })
      if (changed.count !== 1) throw new Error('El vínculo fue actualizado por otra persona.')
      await tx.auditLog.create({ data: { userId: admin.id, action: decision.status === 'ACTIVE' ? 'GUARDIAN_LINK_APPROVED' : 'GUARDIAN_LINK_REVOKED', entityId: id, metadata: { guardianId: link.guardianId, patientId: link.patientId, reason: decision.reason, before: { relationship: link.relationship, status: link.status, canUpload: link.canUpload, validUntil: link.validUntil?.toISOString() ?? null }, after: { relationship: decision.relationship || link.relationship, status: decision.status, canUpload: decision.canUpload, validUntil: decision.validUntil?.toISOString() ?? null }, authorityVerified: decision.status === 'ACTIVE', minorVerified: decision.status === 'ACTIVE' } } })
    }, { isolationLevel: 'Serializable' })
    revalidatePath('/dashboard', 'layout')
    return { success: 'Cambio registrado en auditoría.' }
  } catch (e) { return { error: e instanceof Error ? e.message : 'No se pudo guardar.' } }
}
