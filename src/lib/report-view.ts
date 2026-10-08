export type ReportActivity = {
  id: string
  docType: string
  specialty: string | null
  bodyPart: string | null
  createdAt: string
  user: { fullName: string }
}

export function reportActivity(document: {
  id: string; docType: string; specialty: string | null; bodyPart: string | null;
  createdAt: Date; user: { fullName: string }
}): ReportActivity {
  return {
    id: document.id, docType: document.docType, specialty: document.specialty,
    bodyPart: document.bodyPart, createdAt: document.createdAt.toISOString(),
    user: { fullName: document.user.fullName },
  }
}

export function inactivityLabel(days: number | null) {
  if (days === null) return 'Sin documentos registrados'
  return days >= 365 ? 'Más de 1 año sin cargas de documentos' : `Sin cargas de documentos en los últimos ${days} días`
}
