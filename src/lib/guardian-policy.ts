import { validDateOnly } from '@/lib/file-policy'
export const relationships = ['PADRE', 'MADRE', 'TUTOR_LEGAL'] as const
export function relationshipLabel(value: string) { return value === 'PADRE' ? 'Padre' : value === 'MADRE' ? 'Madre' : 'Tutor legal' }
export function guardianDecision(data: FormData, now = new Date()) {
  const relationship = data.get('relationship')
  if (relationship !== null && !relationships.includes(relationship as typeof relationships[number])) throw new Error('Relación inválida.')
  const reason = String(data.get('reason') || '').trim()
  if (reason.length < 10 || reason.length > 500) throw new Error('Escribe un motivo de entre 10 y 500 caracteres.')
  const status = String(data.get('status') || '')
  if (!['ACTIVE','REVOKED'].includes(status)) throw new Error('Estado inválido.')
  if (status === 'REVOKED') return { status, reason, canUpload: false, validUntil: null, relationship: typeof relationship === 'string' ? relationship : undefined }
  if (data.get('authorityVerified') !== 'on') throw new Error('Marca la verificación de identidad y autoridad del representante.')
  if (data.get('minorVerified') !== 'on') throw new Error('Marca la confirmación de que el paciente es menor.')
  const date = data.get('validUntil')
  if (!validDateOnly(date)) throw new Error('Indica una fecha de vencimiento para revisar el vínculo.')
  const validUntil = new Date(date + 'T23:59:59.999-04:00')
  if (validUntil <= now) throw new Error('El vencimiento debe ser futuro.')
  return { status, reason, validUntil, relationship: typeof relationship === 'string' ? relationship : undefined, canUpload: data.get('canUpload') === 'on' }
}
