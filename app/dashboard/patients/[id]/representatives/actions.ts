'use server'
import { prisma } from '@/lib/prisma'
import { getValidatedSession } from '@/lib/auth'
import { clinicDoctorId, canReadPatient } from '@/lib/access'
import { getLicenseAccess } from '@/lib/license-access'
import { relationships } from '@/lib/guardian-policy'
import { revalidatePath } from 'next/cache'
import type { GuardianState } from 'app/dashboard/admin/guardians/actions'
export async function requestRepresentative(patientId: string, _state: GuardianState, data: FormData): Promise<GuardianState> {
  try {
    const session = await getValidatedSession()
    if (!session) throw new Error('Inicia sesión para continuar.')
    const actor = await prisma.user.findUnique({ where: { id: session.userId } })
    if (!actor || !await clinicDoctorId(actor) || !await canReadPatient(actor, patientId) || !(await getLicenseAccess(actor.id)).active) throw new Error('Necesitas acceso clínico autorizado y licencia activa.')
    const email = String(data.get('guardianEmail') || '').trim().toLowerCase(), relationship = String(data.get('relationship') || '')
    if (!email || !relationships.includes(relationship as typeof relationships[number])) throw new Error('Verifica el correo y la relación.')
    await prisma.$transaction(async tx => {
      const guardian = await tx.user.findFirst({ where: { email, role: 'PATIENT', active: true }, select: { id: true } })
      if (!guardian || guardian.id === patientId) throw new Error('No se pudo solicitar el vínculo. Verifica que el adulto tenga una cuenta propia activa.')
      if (await tx.guardianLink.findUnique({ where: { guardianId_patientId: { guardianId: guardian.id, patientId } } })) throw new Error('Ya existe una solicitud o vínculo para este adulto. Admin debe revisarlo.')
      const link = await tx.guardianLink.create({ data: { guardianId: guardian.id, patientId, relationship, requestedById: actor.id } })
      await tx.auditLog.create({ data: { userId: actor.id, action: 'GUARDIAN_LINK_REQUESTED', entityId: link.id, metadata: { guardianId: guardian.id, patientId, relationship, status: 'PENDING' } } })
    }, { isolationLevel: 'Serializable' })
    revalidatePath('/dashboard/admin/guardians')
    return { success: 'Solicitud enviada a Admin. Todavía no concede acceso.' }
  } catch (e) { return { error: e instanceof Error ? e.message : 'No se pudo solicitar.' } }
}
export async function setProxyVisibility(patientId: string, documentId: string, data: FormData) {
  const session = await getValidatedSession()
  if (!session) throw new Error('Unauthorized')
  const actor = await prisma.user.findUnique({ where: { id: session.userId } })
  if (!actor || !await clinicDoctorId(actor) || !await canReadPatient(actor, patientId) || !(await getLicenseAccess(actor.id)).active) throw new Error('Unauthorized')
  const proxyVisible = data.get('proxyVisible') === 'true'
  if (proxyVisible && data.get('reviewConfirmed') !== 'on') throw new Error('Confirma que revisaste la posibilidad de compartir este documento.')
  await prisma.$transaction(async tx => {
    const updated = await tx.document.updateMany({ where: { id: documentId, userId: patientId, deletedAt: null }, data: { proxyVisible } })
    if (updated.count !== 1) throw new Error('Documento no disponible')
    await tx.auditLog.create({ data: { userId: actor.id, action: 'DOCUMENT_PROXY_VISIBILITY_CHANGED', entityId: documentId, metadata: { patientId, proxyVisible, reviewConfirmed: proxyVisible } } })
  })
  revalidatePath('/dashboard', 'layout')
}
