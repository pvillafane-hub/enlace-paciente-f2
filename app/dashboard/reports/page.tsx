import { getLicenseAccess } from '@/lib/license-access'
import { prisma } from '@/lib/prisma'
import { getValidatedSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Prisma } from '@prisma/client'
import ActivitySearch from './ActivitySearch'
import { reportFilters, reportHref, reportDocument, type ReportParams } from '@/lib/report-filters'
export const dynamic = 'force-dynamic'
const PAGE_SIZE = 20

export default async function ReportsPage({ searchParams }: { searchParams: Promise<ReportParams> }) {
  const session = await getValidatedSession()
  if (!session?.userId) redirect('/?auth=required')
  const doctor = await prisma.user.findUnique({ where: { id: session.userId }, select: { id: true, role: true, active: true } })
  if (!doctor?.active || doctor.role !== 'DOCTOR') redirect('/dashboard')
  const entitlement = await getLicenseAccess(doctor.id)
  const params = await searchParams
  let error = ''
  let filters = reportFilters({})
  try { filters = reportFilters(params) } catch (e) { error = e instanceof Error ? e.message : 'Verifica los filtros.' }
  const patients = await prisma.doctorPatient.findMany({
    where: { doctorId: doctor.id, patient: { active: true, role: 'PATIENT' } },
    select: { patientId: true, patient: { select: { id: true, fullName: true } } }, orderBy: [{ patient: { fullName: 'asc' } }, { patientId: 'asc' }],
  })
  const ids = patients.map(p => p.patientId)
  if (filters.patient && !ids.includes(filters.patient)) error = 'Selecciona un paciente autorizado de tu lista.'
  const baseWhere: Prisma.DocumentWhereInput = { deletedAt: null, ...entitlement.documentWhere, userId: { in: ids } }
  const pendingWhere: Prisma.MedicalAccessRequestWhereInput = { doctorId: doctor.id, status: 'PENDING', patient: { active: true, role: 'PATIENT' }, ...(entitlement.cutoff ? { createdAt: { lt: entitlement.cutoff } } : {}) }
  const [totalDocuments, types, toAccept, waitingPatient, activity] = await Promise.all([
    prisma.document.count({ where: baseWhere }),
    prisma.document.groupBy({ by: ['docType'], where: baseWhere, _count: true, orderBy: { docType: 'asc' } }),
    prisma.medicalAccessRequest.count({ where: { ...pendingWhere, initiatedBy: 'PATIENT' } }),
    prisma.medicalAccessRequest.count({ where: { ...pendingWhere, OR: [{ initiatedBy: 'DOCTOR' }, { initiatedBy: null }] } }),
    prisma.document.groupBy({ by: ['userId'], where: baseWhere, _max: { createdAt: true } }),
  ])
  const where: Prisma.DocumentWhereInput = error ? { id: { in: [] }, ...baseWhere } : {
    AND: [baseWhere, {
      ...(filters.patient ? { userId: filters.patient } : {}), ...(filters.type ? { docType: filters.type } : {}),
      ...(filters.from || filters.to ? { createdAt: { ...(filters.from ? { gte: filters.from } : {}), ...(filters.to ? { lt: filters.to } : {}) } } : {}),
      ...(filters.q ? { OR: [{ filename: { contains: filters.q, mode: 'insensitive' } }, { docType: { contains: filters.q, mode: 'insensitive' } }, { facility: { contains: filters.q, mode: 'insensitive' } }, { user: { fullName: { contains: filters.q, mode: 'insensitive' } } }] } : {}),
    }],
  }
  const matches = await prisma.document.count({ where })
  const pages = Math.max(1, Math.ceil(matches / PAGE_SIZE)), page = Math.min(filters.page, pages)
  const documents = await prisma.document.findMany({ where, select: { id: true, userId: true, filename: true, docType: true, facility: true, studyDate: true, createdAt: true, user: { select: { fullName: true } } }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: PAGE_SIZE, skip: (page - 1) * PAGE_SIZE })
  const lastByPatient = new Map(activity.map(a => [a.userId, a._max.createdAt]))
  const noRecent = patients.map(p => ({ ...p, last: lastByPatient.get(p.patientId) ?? null })).filter(p => !p.last || (entitlement.active && Date.now() - p.last.getTime() >= 30 * 86400000)).sort((a,b) => (a.last?.getTime() ?? 0) - (b.last?.getTime() ?? 0) || a.patientId.localeCompare(b.patientId))
  const activityPages = Math.max(1, Math.ceil(noRecent.length / PAGE_SIZE)), activityPage = Math.min(filters.activityPage, activityPages)
  return <div className="space-y-8">
    <header className="rounded-xl border bg-white p-4 sm:p-6">
      <h1 className="text-2xl sm:text-3xl font-bold">Reportes de pacientes y documentos</h1>
      <p className="mt-2 text-gray-700">Consulta tus pacientes autorizados, encuentra documentos y revisa las solicitudes pendientes.</p>
    </header>
    {!entitlement.active && <p role="status" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950">Este reporte es histórico y parcial. Solo muestra documentos anteriores al vencimiento de tu licencia. Puede haber cargas posteriores no visibles; las cifras no indican la actividad actual. Los archivos no se pueden abrir sin licencia activa.</p>}
    <section aria-label="Resumen general" className="space-y-3">
      <p className="text-gray-700">Resumen de todos tus pacientes autorizados. Los filtros de abajo se aplican al listado de documentos.</p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Pacientes autorizados" value={patients.length} />
        <Stat label={entitlement.active ? 'Documentos registrados' : 'Documentos históricos visibles'} value={totalDocuments} />
        <Stat label="Invitaciones por aceptar" value={toAccept} href="/dashboard/requests?status=PENDING" />
        <Stat label="Esperando al paciente" value={waitingPatient} href="/dashboard/requests?status=PENDING" />
      </div>
    </section>
    <section aria-labelledby="document-title" className="rounded-xl border bg-white p-4 sm:p-6 space-y-5">
      <h2 id="document-title" className="text-xl font-semibold">Buscar documentos</h2>
      <form method="GET" className="grid sm:grid-cols-2 gap-4">
        <label className="block sm:col-span-2 font-medium">Buscar por paciente, documento o institución<input type="search" name="q" defaultValue={filters.q} maxLength={100} className="mt-2 block w-full rounded-xl border p-3 text-lg" /></label>
        <label className="block font-medium">Paciente<select name="patient" defaultValue={filters.patient} className="mt-2 block w-full rounded-xl border p-3 text-lg"><option value="">Todos mis pacientes</option>{patients.map(p => <option key={p.patientId} value={p.patientId}>{p.patient.fullName}</option>)}</select></label>
        <label className="block font-medium">Tipo de documento<select name="type" defaultValue={filters.type} className="mt-2 block w-full rounded-xl border p-3 text-lg"><option value="">Todos los tipos</option>{types.map(t => <option key={t.docType} value={t.docType}>{t.docType}</option>)}</select></label>
        <label className="block font-medium">Cargado desde<input type="date" name="from" defaultValue={params.from || ''} className="mt-2 block w-full rounded-xl border p-3 text-lg" /></label>
        <label className="block font-medium">Cargado hasta<input type="date" name="to" defaultValue={params.to || ''} className="mt-2 block w-full rounded-xl border p-3 text-lg" /></label>
        <div className="sm:col-span-2 flex flex-wrap items-center gap-4"><button className="min-h-12 rounded-xl bg-blue-700 px-5 py-3 text-lg font-semibold text-white">Buscar</button><Link href="/dashboard/reports" className="inline-flex min-h-12 items-center underline">Limpiar filtros</Link></div>
      </form>
      <p className="text-gray-700">Las fechas filtran por carga, no por fecha del estudio. «Hasta» incluye todo ese día en Puerto Rico.</p>
      {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">{error}</p>}
      <p role="status" className="font-medium">{matches} documentos encontrados</p>
      {documents.length ? <ActivitySearch documents={documents.map(reportDocument)} /> : <p>{!patients.length ? 'Todavía no tienes pacientes autorizados. Revisa tus invitaciones en Solicitudes.' : error ? 'Corrige los filtros para buscar.' : 'No hay documentos visibles que coincidan con estos filtros.'}</p>}
      <Pagination params={params} page={page} pages={pages} field="page" label="Páginas de documentos" />
    </section>
    <section className="rounded-xl border bg-white p-4 sm:p-6 space-y-4">
      <h2 className="text-xl font-semibold">{entitlement.active ? 'Pacientes sin cargas recientes' : 'Pacientes sin documentos visibles'}</h2>
      <p className="text-gray-700">{entitlement.active ? 'Sin documentos o sin nuevas cargas en 30 días. Este dato describe actividad documental, no una evaluación médica.' : 'La ausencia de documentos en este historial no confirma que no existan documentos nuevos.'}</p>
      {!noRecent.length && <p>{!patients.length ? 'Todavía no tienes pacientes autorizados.' : entitlement.active ? 'Tus pacientes autorizados tienen cargas en los últimos 30 días.' : 'Todos tus pacientes autorizados tienen documentos en el historial visible.'}</p>}
      {noRecent.slice((activityPage - 1) * PAGE_SIZE, activityPage * PAGE_SIZE).map(p => <div key={p.patientId} className="rounded-xl border p-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4"><div className="min-w-0 break-words"><p className="text-lg font-semibold">{p.patient.fullName}</p><p className="text-gray-700">{p.last ? `Última carga visible: ${p.last.toLocaleDateString('es-PR', { timeZone: 'America/Puerto_Rico' })}` : 'Sin documentos visibles'}</p></div><Link href={`/dashboard/patients/${p.patientId}`} className="inline-flex min-h-12 items-center rounded-xl border px-4 py-3 shrink-0">Ir al expediente</Link></div>)}
      <Pagination params={params} page={activityPage} pages={activityPages} field="activityPage" label="Páginas de pacientes sin cargas" />
    </section>
  </div>
}
function Stat({ label, value, href }: { label: string; value: number; href?: string }) {
  return <div className="rounded-xl border bg-white p-5"><p className="text-gray-700">{label}</p><p className="mt-2 text-3xl font-bold">{value}</p>{href && <Link href={href} className="inline-flex min-h-12 items-center text-blue-800 underline">Revisar solicitudes</Link>}</div>
}
function Pagination({ params, page, pages, field, label }: { params: ReportParams; page: number; pages: number; field: 'page' | 'activityPage'; label: string }) {
  if (pages < 2) return null
  return <nav aria-label={label} className="flex flex-wrap items-center gap-4">{page > 1 && <Link href={reportHref(params, { [field]: String(page - 1) })} className="inline-flex min-h-12 items-center underline">Anteriores</Link>}<span>Página {page} de {pages}</span>{page < pages && <Link href={reportHref(params, { [field]: String(page + 1) })} className="inline-flex min-h-12 items-center underline">Siguientes</Link>}</nav>
}
