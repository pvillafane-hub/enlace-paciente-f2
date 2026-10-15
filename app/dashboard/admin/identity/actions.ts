'use server'
import { prisma } from '@/lib/prisma'
import { requireActiveAdmin } from '@/lib/admin-session'
import { revalidatePath } from 'next/cache'
export type ReviewState = { error?: string; success?: string }
export async function reviewIdentity(id: string, _state: ReviewState, data: FormData): Promise<ReviewState> {
  const admin = await requireActiveAdmin()
  const decision = String(data.get('decision') || '')
  const reason = String(data.get('reason') || '').trim()
  const existingId = String(data.get('existingId') || '')
  if (data.get('contacted') !== 'on' || reason.length < 10 || reason.length > 1000 || !['DISTINCT','DUPLICATE'].includes(decision)) return { error: 'Confirma la validación con el usuario y documenta la decisión (10 a 1000 caracteres).' }
  try {
    await prisma.$transaction(async tx => {
      const review = await tx.identityReview.findUnique({ where: { id }, include: { user: true } })
      if (!review || review.status !== 'PENDING' || review.user.identityStatus !== 'HOLD') throw new Error('La revisión ya cambió. Recarga antes de continuar.')
      if (decision === 'DUPLICATE' && (!review.candidateIds.includes(existingId) || !await tx.user.findFirst({ where: { id: existingId, role: 'PATIENT' }, select: { id: true } }))) throw new Error('Selecciona el expediente existente verificado.')
      const changed = await tx.identityReview.updateMany({ where: { id, status: 'PENDING' }, data: { status: decision, reason, reviewedById: admin.id, reviewedAt: new Date() } })
      if (changed.count !== 1) throw new Error('La revisión cambió.')
      await tx.user.update({ where: { id: review.userId }, data: { identityStatus: decision === 'DISTINCT' ? 'CLEAR' : 'DUPLICATE', active: decision === 'DISTINCT' } })
      if (decision === 'DISTINCT' && review.doctorId) {
        const doctor = await tx.user.findFirst({ where: { id: review.doctorId, active: true, role: 'DOCTOR' }, select: { id: true } })
        if (!doctor) throw new Error('El doctor de origen ya no está activo. Revisa su asignación antes de liberar.')
        await tx.doctorPatient.upsert({ where: { doctorId_patientId: { doctorId: doctor.id, patientId: review.userId } }, create: { doctorId: doctor.id, patientId: review.userId }, update: {} })
      }
      await tx.session.deleteMany({ where: { userId: review.userId } })
      await tx.auditLog.create({ data: { userId: admin.id, action: 'IDENTITY_REVIEW_COMPLETED', entityId: review.userId, metadata: { decision, reason, existingId: decision === 'DUPLICATE' ? existingId : null, reviewId: id } } })
    }, { isolationLevel: 'Serializable' })
    revalidatePath('/dashboard', 'layout')
    return { success: decision === 'DISTINCT' ? 'Cuenta liberada. El paciente puede entrar; su licencia se administra por separado.' : 'Registro duplicado bloqueado. Contacta al usuario para recuperar el expediente existente por el proceso normal; no se movieron documentos ni permisos.' }
  } catch(e) { return { error: e instanceof Error ? e.message : 'No se pudo revisar.' } }
}
