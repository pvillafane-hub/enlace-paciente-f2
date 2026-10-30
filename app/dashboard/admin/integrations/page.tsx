import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { requireActiveAdmin } from '@/lib/admin-session'
import { sandboxState } from '@/lib/interop/admin-view'
import { authLabels, directionLabels, preparationIssues, protocolLabels, type IntegrationValues } from '@/lib/integrations/policy'
import IntegrationForm from './IntegrationForm'

export const dynamic = 'force-dynamic'
export default async function IntegrationsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireActiveAdmin(true)
  const enabled = sandboxState() === 'ready'
  const params = await searchParams
  const q = typeof params.q === 'string' ? params.q.trim().slice(0,120) : ''
  const where = q ? { OR: [{ name: { contains: q, mode: 'insensitive' as const } }, { code: { contains: q, mode: 'insensitive' as const } }] } : {}
  const model = enabled ? await Promise.all([
    prisma.interopIntegrationDraft.findMany({ where, orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }], take: 50 }),
    prisma.interopIntegrationDraft.count({ where }),
  ]).then(([records, total]) => ({ records, total })).catch(() => null) : null
  return <section className="min-w-0 space-y-6 text-lg" aria-labelledby="integrations-title">
    <div className="flex flex-wrap items-center gap-3"><h1 id="integrations-title" className="text-3xl font-bold">Integraciones</h1><span className="rounded-full bg-indigo-100 px-3 py-2 font-semibold text-indigo-900">Preparación · Pruebas</span></div>
    <p>Organiza la configuración de cada laboratorio y prepara su intercambio de resultados con Enlace Salud.</p>
    <aside className="space-y-2 rounded-xl border border-amber-300 bg-amber-50 p-5 text-amber-950"><h2 className="text-xl font-semibold">Configuración guardada no significa conexión validada</h2><p>Estas fichas son borradores. La conexión externa, las credenciales y la compatibilidad se comprueban con el laboratorio antes de habilitar un conector. No se activan integraciones desde esta pantalla.</p></aside>
    <div className="flex flex-wrap gap-3"><a href="#new-integration" className="inline-flex min-h-12 items-center rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white">Añadir laboratorio</a><Link href="/dashboard/admin/interoperability" className="inline-flex min-h-12 items-center rounded-xl border px-5 py-3 font-semibold">Ver bandeja de pruebas</Link></div>
    {!enabled ? <p role="status" className="rounded-xl border p-5">La preparación de integraciones está deshabilitada fuera del entorno aislado de pruebas.</p> : !model ? <p role="alert" className="rounded-xl border border-red-300 p-5">No se pudo consultar la configuración. Verifica las tablas del entorno de pruebas antes de continuar.</p> : <>
      <section className="rounded-xl border bg-white p-5" aria-labelledby="steps-title"><h2 id="steps-title" className="text-xl font-semibold">Cómo se prepara una conexión</h2><ol className="mt-3 list-decimal space-y-2 pl-6"><li>Guarda la ficha del laboratorio y su formato de intercambio.</li><li>Acuerda la dirección, autenticación y reglas con su equipo técnico.</li><li>Implementa y prueba el conector con pacientes y resultados ficticios.</li><li>Valida la entrega y los permisos antes de planificar su activación.</li></ol></section>
      <section className="space-y-4" aria-labelledby="labs-title"><h2 id="labs-title" className="text-2xl font-semibold">Laboratorios configurados</h2><form method="GET" className="flex flex-wrap gap-3"><label className="min-w-0 grow">Buscar por nombre o código<input name="q" defaultValue={q} maxLength={120} className="mt-2 block min-h-12 w-full rounded-xl border p-3" /></label><button className="min-h-12 self-end rounded-xl border px-5 py-3 font-semibold">Buscar</button></form><p>{model.total} fichas encontradas. Se muestran hasta 50.</p>
      {!model.records.length && <p className="rounded-xl border border-dashed p-5">{q ? 'No hay laboratorios que coincidan con la búsqueda.' : 'Todavía no hay laboratorios configurados. Añade el primero para preparar la prueba.'}</p>}
      {model.records.map(row => {
        const record = { ...row, protocol: row.protocol as IntegrationValues['protocol'], direction: row.direction as IntegrationValues['direction'], authType: row.authType as IntegrationValues['authType'], status: row.status as IntegrationValues['status'], endpoint: row.endpoint || '', credentialRef: row.credentialRef || '', notes: row.notes || '' }
        const issues = preparationIssues(record)
        return <article key={row.id} className="min-w-0 space-y-4 rounded-2xl border bg-white p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h3 className="break-words text-2xl font-bold">{row.name}</h3><p className="break-all text-slate-600">{row.code}</p></div><span className="rounded-full bg-slate-100 px-3 py-2 font-semibold">{row.status === 'PAUSED' ? 'Pausada' : 'Borrador'}</span></div>
          <dl className="grid min-w-0 gap-4 sm:grid-cols-2">{[['Formato', protocolLabels[record.protocol]], ['Dirección', directionLabels[record.direction]], ['Autenticación prevista', authLabels[record.authType]], ['Conexión externa', 'Sin probar · no habilitada']].map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-slate-600">{label}</dt><dd className="break-words font-semibold">{value}</dd></div>)}</dl>
          <p className="rounded-xl bg-blue-50 p-4">{issues.length ? 'Datos pendientes: ' + issues.join(' ') : 'Datos básicos completos para revisión técnica. Falta validar la conexión con el laboratorio.'}</p>
          <p className="text-slate-600">Último cambio: {row.updatedAt.toLocaleString('es-PR', { timeZone: 'America/Puerto_Rico' })} (Puerto Rico).</p>
          <details className="min-w-0 rounded-xl border p-4"><summary className="min-h-12 cursor-pointer py-3 font-semibold">Ver o editar configuración</summary><div className="mt-4"><IntegrationForm record={record} /></div></details>
        </article>
      })}</section>
      <section id="new-integration" className="min-w-0 scroll-mt-6 rounded-2xl border bg-white p-5"><details open={!model.records.length}><summary className="min-h-12 cursor-pointer py-3 text-2xl font-semibold">Añadir laboratorio</summary><div className="mt-5"><IntegrationForm /></div></details></section>
    </>}
  </section>
}
