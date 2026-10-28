import Link from 'next/link'
import { requireActiveAdmin } from '@/lib/admin-session'
import { adminInteropReceipts, interopFilter, safeResultSummary } from '@/lib/interop/admin-view'

export const dynamic = 'force-dynamic'
const labels = { ALL: 'Todos', MATCHED: 'Identificados', PENDING_REVIEW: 'Pendientes de identificación' }
const actions: Record<string, string> = {
  RECEIVED_MATCHED: 'Recibido e identificado en pruebas',
  RECEIVED_PENDING_REVIEW: 'Recibido; identidad pendiente',
  DUPLICATE_RECEIVED: 'Reenvío idéntico reconocido',
  CONFLICT_REJECTED: 'Reenvío con cambios rechazado',
}
const date = (value: Date) => value.toLocaleString('es-PR', { timeZone: 'America/Puerto_Rico' })
export default async function InteroperabilityPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireActiveAdmin(true)
  const filter = interopFilter((await searchParams).status)
  const model = await adminInteropReceipts(filter)
  return <section className="min-w-0 space-y-6" aria-labelledby="interop-title">
    <div className="flex flex-wrap items-center gap-3"><h1 id="interop-title" className="text-3xl font-bold">Interoperabilidad</h1><span className="rounded-full bg-indigo-100 px-3 py-2 font-semibold text-indigo-900">Fase 3 · Pruebas</span></div>
    <p className="text-lg text-gray-700">Recibe y consulta resultados ficticios de laboratorio por API JSON, FHIR R4 y un perfil limitado de HL7 v2.</p>
    <aside className="rounded-xl border border-amber-300 bg-amber-50 p-5 text-amber-950"><h2 className="text-xl font-semibold">Solo datos ficticios</h2><p className="mt-2">Los recibos permanecen separados del expediente clínico. Identificado significa que coincide con un paciente de prueba; no significa entregado al paciente ni al doctor.</p></aside>
    <section className="rounded-xl border bg-white p-5" aria-labelledby="connection-title"><h2 id="connection-title" className="text-xl font-semibold">Estado del entorno</h2>
      <p role="status" className="mt-3 font-semibold">{model.state === 'ready' ? 'Entorno de pruebas habilitado' : model.state === 'disabled' ? 'Recepción de pruebas deshabilitada' : model.state === 'unconfigured' ? 'Configuración de pruebas incompleta' : 'Bandeja temporalmente no disponible'}</p>
      <p className="mt-2 text-gray-700">{model.state === 'ready' ? 'La bandeja consulta recibos de una fuente de pruebas. No hay una conexión con un laboratorio real validada.' : model.state === 'disabled' ? 'Para recibir mensajes se necesita un entorno aislado. La recepción no se habilita en producción.' : model.state === 'unconfigured' ? 'El responsable técnico debe completar la fuente y la credencial del entorno aislado.' : 'No se pudieron consultar los recibos. Verifica la base aislada y sus migraciones; después vuelve a intentar.'}</p>
      <dl className="mt-4 grid gap-4 sm:grid-cols-3">{[['API JSON', 'Resultados finales'], ['FHIR R4', 'Bundle de laboratorio limitado'], ['HL7 v2.5.1', 'ORU R01 de pruebas']].map(([title, detail]) => <div key={title}><dt className="font-semibold">{title}</dt><dd className="text-gray-600">{detail}</dd></div>)}</dl>
    </section>
    <section aria-labelledby="inbox-title" className="space-y-4"><h2 id="inbox-title" className="text-2xl font-semibold">Bandeja de resultados de prueba</h2>
      <nav aria-label="Filtrar recibos" className="flex flex-wrap gap-3">{Object.entries(labels).map(([key, label]) => <Link key={key} href={`?status=${key}`} aria-current={filter === key ? 'page' : undefined} className={`inline-flex min-h-12 items-center rounded-xl border px-4 py-3 font-semibold ${filter === key ? 'border-blue-700 bg-blue-700 text-white' : 'border-gray-300 bg-white text-gray-800'}`}>{label}</Link>)}</nav>
      {model.state === 'ready' && <><p className="text-gray-600">Mostrando los últimos {model.receipts.length} recibos del filtro seleccionado, hasta un máximo de 50. Los reenvíos aparecen dentro del recibo original.</p>
        {model.receipts.length === 0 && <p className="rounded-xl border border-dashed p-6">No hay recibos para este filtro. Envía un resultado ficticio desde el entorno de integración para comenzar.</p>}
        {model.receipts.map(row => { const summary = safeResultSummary(row.normalized); return <article key={row.id} className="min-w-0 space-y-4 rounded-xl border bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-3"><h3 className="break-all text-xl font-semibold">{row.reportId}</h3><span className={`rounded-full px-3 py-2 font-semibold ${row.status === 'MATCHED' ? 'bg-green-100 text-green-950' : 'bg-amber-100 text-amber-950'}`}>{row.status === 'MATCHED' ? 'Identificado en pruebas' : 'Pendiente de identificación'}</span></div>
          <p className="break-words text-gray-600">Fuente: {row.source} · Formato: {row.format} · Recibido: {date(row.createdAt)} (Puerto Rico)</p>
          {summary && <dl className="grid gap-4 sm:grid-cols-2"><div><dt className="font-semibold">Paciente ficticio</dt><dd className="break-all">{summary.patientId}</dd></div><div><dt className="font-semibold">Fecha de nacimiento</dt><dd>{summary.birthDate}</dd></div><div><dt className="font-semibold">Código de prueba</dt><dd className="break-all">{summary.testCode}</dd></div><div><dt className="font-semibold">Emisión del laboratorio</dt><dd className="break-all">{summary.issued}</dd></div></dl>}
          {summary && summary.observations.length > 0 && <details className="rounded-lg border p-3"><summary className="min-h-12 cursor-pointer py-3 font-semibold">Ver valores del resultado ficticio</summary><ul className="space-y-3 border-t pt-3">{summary.observations.map((observation, index) => <li key={index} className="flex flex-wrap justify-between gap-3 rounded-lg bg-gray-50 p-3"><span className="break-all">Código: {observation.code}</span><span className="break-all font-semibold">{observation.value} {observation.unit}</span></li>)}</ul></details>}
          {row.status === 'PENDING_REVIEW' && <p className="rounded-lg bg-amber-50 p-3 text-amber-950">El identificador o la fecha de nacimiento no coincide con el paciente ficticio configurado. Este resultado no se asignó a un expediente. La aprobación manual se incorporará en una etapa posterior.</p>}
          <details className="rounded-lg border p-3"><summary className="min-h-12 cursor-pointer py-3 font-semibold">Ver últimos eventos de recepción</summary><ul className="space-y-2 border-t pt-3">{row.events.map(event => <li key={event.id}>{actions[event.action] || 'Evento de recepción'} · {date(event.createdAt)} (Puerto Rico)</li>)}</ul><p className="mt-3 break-all text-sm text-gray-600">ID del recibo: {row.id}. Se muestran hasta 5 eventos recientes.</p></details>
        </article> })}
      </>}
    </section>
    <section className="rounded-xl bg-blue-50 p-5"><h2 className="text-xl font-semibold">Cómo validar esta etapa</h2><ol className="mt-3 list-decimal space-y-2 pl-6"><li>Preparar una base PostgreSQL aislada y aplicar las tablas de pruebas.</li><li>Enviar los ejemplos ficticios de API JSON, FHIR y HL7.</li><li>Revisar aquí los recibos identificados y pendientes, además de los reenvíos y conflictos.</li><li>Reiniciar el entorno y comprobar que los recibos permanecen disponibles.</li></ol><p className="mt-3 text-gray-700">Esta pantalla es de consulta. Todavía no incorpora aprobación de identidad ni entrega al expediente clínico.</p></section>
  </section>
}
