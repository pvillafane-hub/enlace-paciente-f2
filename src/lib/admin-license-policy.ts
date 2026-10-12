import { validDateOnly } from '@/lib/file-policy'

export type LicenseActionState = { error?: string; success?: string }
export class LicenseInputError extends Error {}
export function licenseDateInput(date: Date | null) {
  return date ? new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Puerto_Rico', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date) : ''
}
export function parseLicenseForm(data: FormData, now = new Date()) {
  const plan = data.get('plan'), status = data.get('status'), reason = data.get('reason')
  if (plan !== 'BASIC' && plan !== 'PRO') throw new LicenseInputError('Selecciona un plan válido.')
  if (status !== 'ACTIVE' && status !== 'INACTIVE') throw new LicenseInputError('Selecciona un estado válido.')
  if (typeof reason !== 'string' || reason.trim().length < 5 || reason.trim().length > 500) throw new LicenseInputError('Escribe un motivo de entre 5 y 500 caracteres.')
  let validUntil: Date | null = null
  if (data.get('unlimited') !== 'on') {
    const date = data.get('validUntil')
    if (!validDateOnly(date)) throw new LicenseInputError('Indica una fecha válida o marca Sin vencimiento.')
    validUntil = new Date(`${date}T23:59:59.999-04:00`)
    if (status === 'ACTIVE' && validUntil <= now) throw new LicenseInputError('Una licencia activa debe tener una fecha futura.')
  }
  return { plan, status, validUntil, reason: reason.trim() }
}
export type LicenseSnapshot = { id: string; userId: string; role: string; status: string; plan: string | null; validUntil: Date | null }
export function licenseSnapshot(license: LicenseSnapshot) {
  return { id: license.id, userId: license.userId, role: license.role, status: license.status, plan: license.plan, validUntil: license.validUntil?.toISOString() ?? null }
}
export function licenseRevision(license: LicenseSnapshot) {
  return JSON.stringify(licenseSnapshot(license))
}
