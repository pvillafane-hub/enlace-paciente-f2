export type BellAlert = { id: string; type: string; patientName: string; patientId: string; createdAt: string }
export type AlertSummary = { alerts: BellAlert[]; total: number; status: 'ready' | 'license-required' | 'error' }
export function parseAlertSummary(value: unknown): AlertSummary | null {
  if (!value || typeof value !== 'object') return null
  const data = value as AlertSummary
  if (!['ready','license-required'].includes(data.status) || !Number.isInteger(data.total) || data.total < 0 || !Array.isArray(data.alerts) || data.alerts.length > 5 || data.total < data.alerts.length) return null
  if (data.alerts.some(a => !a || ['id','type','patientName','patientId','createdAt'].some(key => typeof a[key as keyof BellAlert] !== 'string') || !Number.isFinite(new Date(a.createdAt).getTime()))) return null
  if (data.status === 'license-required' && (data.total || data.alerts.length)) return null
  return { status: data.status, total: data.total, alerts: data.alerts.map(a => ({ id: a.id, type: a.type, patientName: a.patientName, patientId: a.patientId, createdAt: a.createdAt })) }
}
export function alertMessage(type: string) {
  return type === 'NO_ACTIVITY' ? 'Aviso de actividad documental' : 'Alerta registrada para revisión'
}
