import { validDateOnly } from '@/lib/file-policy'
export type ReportParams = { q?: string; patient?: string; type?: string; from?: string; to?: string; page?: string; activityPage?: string }
export function reportFilters(params: ReportParams) {
  const q = (params.q || '').trim(), patient = params.patient || '', type = (params.type || '').trim()
  if ([q, patient, type, params.from || '', params.to || ''].some(value => typeof value !== 'string') || q.length > 100 || patient.length > 100 || type.length > 80) throw new Error('Verifica los filtros de búsqueda.')
  if ((params.from && !validDateOnly(params.from)) || (params.to && !validDateOnly(params.to)) || (params.from && params.to && params.from > params.to)) throw new Error('Verifica las fechas: Desde debe ser anterior o igual a Hasta.')
  const from = params.from ? new Date(params.from + 'T00:00:00-04:00') : undefined
  const to = params.to ? new Date(new Date(params.to + 'T00:00:00-04:00').getTime() + 86400000) : undefined
  const pageNumber = (value?: string) => value && /^\d{1,5}$/.test(value) ? Math.max(1, Number(value)) : 1
  return { q, patient, type, from, to, page: pageNumber(params.page), activityPage: pageNumber(params.activityPage) }
}
export function reportHref(params: ReportParams, updates: Partial<ReportParams>) {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries({ ...params, ...updates })) if (value) query.set(key, value)
  return '/dashboard/reports?' + query.toString()
}
export type ReportDocument = { id: string; userId: string; filename: string; docType: string; facility: string; studyDate: string; createdAt: Date; user: { fullName: string } }
export function reportDocument(document: ReportDocument) {
  return { id: document.id, patientId: document.userId, patientName: document.user.fullName, filename: document.filename, docType: document.docType, facility: document.facility, studyDate: document.studyDate, createdAt: document.createdAt.toISOString() }
}
