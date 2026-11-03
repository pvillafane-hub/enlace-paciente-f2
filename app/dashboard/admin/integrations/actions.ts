'use server'
import { prisma } from '@/lib/prisma'
import { requireActiveAdmin } from '@/lib/admin-session'
import { sandboxState } from '@/lib/interop/admin-view'
import { integrationValues } from '@/lib/integrations/policy'
import { revalidatePath } from 'next/cache'
export type IntegrationState = { error?: string; success?: string }
export async function saveIntegration(id: string | null, version: number | null, _state: IntegrationState, data: FormData): Promise<IntegrationState> {
  const admin = await requireActiveAdmin()
  if (sandboxState() !== 'ready') return { error: 'Las integraciones se preparan únicamente en el entorno aislado de pruebas.' }
  if (data.get('confirmed') !== 'on') return { error: 'Confirma que estás guardando una configuración de pruebas.' }
  let values
  try { values = integrationValues(data) } catch (e) { return { error: e instanceof Error ? e.message : 'Verifica los campos.' } }
  try {
    await prisma.$transaction(async tx => {
      if (!await tx.user.findFirst({ where: { id: admin.id, role: 'ADMIN', active: true }, select: { id: true } })) throw new Error('UNAUTHORIZED')
      const record = { ...values, endpoint: values.endpoint || null, credentialRef: values.credentialRef || null, notes: values.notes || null, updatedById: admin.id }
      let entityId: string
      if (id) {
        if (!Number.isInteger(version) || !version || version < 1) throw new Error('STALE')
        const changed = await tx.interopIntegrationDraft.updateMany({ where: { id, version }, data: { ...record, version: { increment: 1 } } })
        if (changed.count !== 1) throw new Error('STALE')
        entityId = id
      } else {
        const created = await tx.interopIntegrationDraft.create({ data: { ...record, createdById: admin.id } })
        entityId = created.id
      }
      await tx.auditLog.create({ data: { userId: admin.id, action: id ? 'INTEGRATION_DRAFT_UPDATED' : 'INTEGRATION_DRAFT_CREATED', entityId, metadata: { code: values.code, protocol: values.protocol, direction: values.direction, status: values.status, connectionTested: false } } })
    }, { isolationLevel: 'Serializable' })
    revalidatePath('/dashboard/admin/integrations')
    return { success: 'Configuración guardada. La conexión externa todavía no está probada ni habilitada.' }
  } catch (e) {
    if (e instanceof Error && e.message === 'STALE') return { error: 'Otra persona modificó esta configuración. Recarga antes de guardar nuevamente.' }
    if (e && typeof e === 'object' && 'code' in e && e.code === 'P2002') return { error: 'Ese código de laboratorio ya existe. Utiliza otro código o edita la ficha existente.' }
    return { error: 'No se pudo guardar. Verifica tu acceso y vuelve a intentarlo.' }
  }
}
