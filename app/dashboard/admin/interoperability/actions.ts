'use server'
import { prisma } from '@/lib/prisma'
import { requireActiveAdmin } from '@/lib/admin-session'
import { sandboxState } from '@/lib/interop/admin-view'
import { revalidatePath } from 'next/cache'

export type InteropReviewState = { error?: string; success?: string }
export async function reviewInterop(id: string, _state: InteropReviewState, data: FormData): Promise<InteropReviewState> {
  const admin = await requireActiveAdmin()
  if (sandboxState() !== 'ready') return { error: 'La revisión solo está disponible en el entorno aislado de pruebas.' }
  const decision = String(data.get('decision') || '')
  const reason = String(data.get('reason') || '').trim()
  if (!['MANUALLY_MATCHED', 'REJECTED'].includes(decision) || reason.length < 10 || reason.length > 1000 || data.get('confirmed') !== 'on') return { error: 'Selecciona una decisión, escribe un motivo de 10 a 1000 caracteres y confirma la revisión.' }
  if (decision === 'MANUALLY_MATCHED' && data.get('patientId') !== 'TEST-PATIENT-001') return { error: 'Selecciona el paciente ficticio configurado.' }
  try {
    const changed = await prisma.$transaction(async tx => {
      const actor = await tx.user.findFirst({ where: { id: admin.id, role: 'ADMIN', active: true }, select: { id: true } })
      if (!actor) throw new Error('Unauthorized')
      const result = await tx.interopSandboxReceipt.updateMany({ where: { id, source: process.env.INTEROP_SANDBOX_SOURCE!, status: 'PENDING_REVIEW' }, data: { status: decision } })
      if (result.count !== 1) return false
      await tx.interopSandboxEvent.create({ data: { receiptId: id, action: decision === 'REJECTED' ? 'IDENTITY_REJECTED' : 'IDENTITY_CONFIRMED_MANUALLY', actorId: actor.id, reason, patientId: decision === 'MANUALLY_MATCHED' ? 'TEST-PATIENT-001' : null } })
      return true
    })
    if (!changed) return { error: 'El recibo ya fue revisado o no está disponible. Recarga la bandeja.' }
    revalidatePath('/dashboard/admin/interoperability')
    return { success: 'Decisión registrada. El resultado original se conserva; no se entregó a un expediente clínico.' }
  } catch { return { error: 'No se pudo guardar la decisión. Vuelve a consultar la bandeja antes de intentar otra vez.' } }
}
