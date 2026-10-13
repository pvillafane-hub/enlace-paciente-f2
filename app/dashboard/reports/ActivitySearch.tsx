import Link from 'next/link'
import type { reportDocument } from '@/lib/report-filters'
const dateLabel = (value: string, dateOnly = false) => {
  const date = new Date(value)
  return Number.isFinite(date.getTime()) ? date.toLocaleDateString('es-PR', { timeZone: dateOnly ? 'UTC' : 'America/Puerto_Rico' }) : 'No registrada'
}
export default function ActivitySearch({ documents }: { documents: ReturnType<typeof reportDocument>[] }) {
  return <div className="space-y-4">{documents.map(doc => <article key={doc.id} className="rounded-xl border p-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
    <div className="min-w-0 [overflow-wrap:anywhere]">
      <h3 className="text-lg font-semibold">{doc.patientName}</h3>
      <p className="font-medium">{doc.filename}</p>
      <p className="text-gray-700">{doc.docType}{doc.facility ? ` · ${doc.facility}` : ''}</p>
      <p className="text-gray-700">Estudio: {dateLabel(doc.studyDate, true)} · Cargado: {dateLabel(doc.createdAt)}</p>
    </div>
    <Link href={`/dashboard/patients/${doc.patientId}`} className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-xl bg-blue-700 px-4 py-3 text-white">Ir al expediente</Link>
  </article>)}</div>
}
