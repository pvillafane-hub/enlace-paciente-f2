import Link from 'next/link'
import ReviewForm from './ReviewForm'
import { BindingForm, DeliveryForm } from './DeliveryForm'
import { deliveryModel } from '@/lib/interop/delivery'
import { requireActiveAdmin } from '@/lib/admin-session'
import { adminInteropReceipts, interopFilter, safeResultSummary } from '@/lib/interop/admin-view'

export const dynamic = 'force-dynamic'

const filters = {
  ALL: 'Todos',
  MATCHED: 'Identificados',
  PENDING_REVIEW: 'Por revisar',
  MANUALLY_MATCHED: 'Confirmados',
  REJECTED: 'Rechazados',
}
const statusLabels: Record<string, [string, string]> = {
  MATCHED: ['Listo para entregar', 'bg-emerald-50 text-emerald-800'],
  MANUALLY_MATCHED: ['Identidad confirmada', 'bg-emerald-50 text-emerald-800'],
  PENDING_REVIEW: ['Requiere revisión', 'bg-amber-50 text-amber-900'],
  REJECTED: ['Rechazado', 'bg-rose-50 text-rose-800'],
}
const activityLabels: Record<string, string> = {
  DELIVERED_TO_SYNTHETIC_RECORD: 'Entregado al expediente',
  IDENTITY_CONFIRMED_MANUALLY: 'Identidad confirmada',
  IDENTITY_REJECTED: 'Identificación rechazada',
  RECEIVED_MATCHED: 'Recibido e identificado',
  RECEIVED_PENDING_REVIEW: 'Recibido para revisión',
  DUPLICATE_RECEIVED: 'Reenvío idéntico reconocido',
  CONFLICT_REJECTED: 'Reenvío con cambios rechazado',
}
const unavailable = {
  disabled: ['Recepción de pruebas deshabilitada', 'La bandeja de demostración está disponible en el entorno aislado.'],
  unconfigured: ['Configuración de pruebas incompleta', 'Pide al equipo técnico que termine de preparar el entorno de demostración.'],
  unavailable: ['Bandeja temporalmente no disponible', 'Vuelve a cargar la página en unos minutos.'],
}
const date = (value: Date) => value.toLocaleString('es-PR', {
  dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Puerto_Rico',
})
const panel = 'min-w-0 rounded-2xl border border-slate-200 bg-white shadow-sm'
const disclosure = 'cursor-pointer rounded-xl px-4 py-3 font-semibold text-blue-800 hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700'

export default async function InteroperabilityPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireActiveAdmin(true)
  const filter = interopFilter((await searchParams).status)
  const model = await adminInteropReceipts(filter)
  const delivery = model.state === 'ready' ? await deliveryModel().catch(() => null) : null
  const binding = delivery?.binding

  return <section className="min-w-0 space-y-6" aria-labelledby="interop-title">
    <header className="rounded-2xl bg-slate-900 px-5 py-7 text-white sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div className="space-y-3">
          <span className="inline-flex rounded-full bg-blue-200 px-3 py-1 text-sm font-semibold text-blue-950">Piloto · Solo datos ficticios</span>
          <h1 id="interop-title" className="text-3xl font-bold sm:text-4xl">Interoperabilidad</h1>
          <p className="max-w-xl text-slate-200">Revisa los resultados de laboratorio y entrégalos al expediente de demostración.</p>
        </div>
        <Link href="/dashboard/admin/integrations" className="inline-flex min-h-11 items-center rounded-xl bg-white px-4 py-2 font-semibold text-slate-900 hover:bg-blue-50">Gestionar laboratorios</Link>
      </div>
    </header>

    {model.state !== 'ready' ? <div role="status" className={panel + ' p-5'}>
      <h2 className="text-lg font-bold">{unavailable[model.state][0]}</h2>
      <p className="mt-1 text-slate-600">{unavailable[model.state][1]}</p>
    </div> : <>
      <section aria-labelledby="destination-title" className={panel + ' p-5'}>
        <h2 id="destination-title" className="text-sm font-semibold text-slate-600">Expediente de demostración</h2>
        {binding ? <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0"><p className="break-words font-bold">{binding.user.fullName}</p><p className="break-all text-sm text-slate-600">{binding.user.email}</p></div>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-800">Cuenta vinculada</span>
        </div> : delivery?.candidates.length ? <details className="mt-2">
          <summary className={disclosure}>Vincular una cuenta de prueba</summary>
          <div className="mt-3"><BindingForm candidates={delivery.candidates} /></div>
        </details> : <p className="mt-2 text-slate-700">{delivery ? 'No hay una cuenta de prueba elegible para vincular.' : 'No se pudo consultar la vinculación. Vuelve a cargar la página.'}</p>}
      </section>

      <section aria-labelledby="inbox-title" className="space-y-4">
        <div>
          <h2 id="inbox-title" className="text-2xl font-bold">Bandeja de resultados</h2>
          <p className="mt-1 text-sm text-slate-600">Hora de Puerto Rico · Hasta 50 resultados por filtro</p>
        </div>
        <nav aria-label="Filtrar resultados" className="flex flex-wrap gap-2">
          {Object.entries(filters).map(([key, label]) => <Link key={key} href={`?status=${key}`} aria-current={filter === key ? 'page' : undefined} className={`inline-flex min-h-11 items-center rounded-xl border px-4 py-2 text-sm font-semibold ${filter === key ? 'border-blue-700 bg-blue-700 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-blue-400'}`}>{label}</Link>)}
        </nav>
        {model.receipts.length === 0 && <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-slate-600">No hay recibos para este filtro.</p>}
        {model.receipts.map(row => {
          const [label, tone] = row.deliveredAt ? ['Entregado', 'bg-blue-50 text-blue-900'] : statusLabels[row.status] ?? ['Estado no disponible', 'bg-slate-100 text-slate-800']
          const pending = row.status === 'PENDING_REVIEW'
          const identity = pending ? safeResultSummary(row.normalized) : null
          return <article key={row.id} className={panel + ' space-y-4 p-5'}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold">Resultado de laboratorio</h3>
                <p className="mt-1 text-sm text-slate-600">Recibido: {date(row.createdAt)}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-sm font-semibold ${tone}`}>{label}</span>
            </div>
            {row.deliveredAt ? <p className="text-sm text-slate-700">Entregado al expediente de demostración el {date(row.deliveredAt)}.</p> : pending ? <details className="rounded-xl border border-amber-200 bg-amber-50">
              <summary className={disclosure}>Revisar identificación</summary>
              <div className="space-y-3 p-4">
                <p className="text-amber-950">El resultado no se asignó a un expediente. Verifica la discrepancia antes de registrar tu decisión.</p>
                {identity && <dl className="grid gap-3 sm:grid-cols-2">
                  <div className="min-w-0"><dt className="text-sm font-semibold">Identificador recibido</dt><dd className="break-all">{identity.patientId}</dd></div>
                  <div><dt className="text-sm font-semibold">Nacimiento recibido</dt><dd>{identity.birthDate}</dd></div>
                </dl>}
                <ReviewForm id={row.id} />
              </div>
            </details> : (row.status === 'MATCHED' || row.status === 'MANUALLY_MATCHED') && (binding ? <details className="rounded-xl border border-blue-100 bg-blue-50/40">
              <summary className={disclosure}>Preparar entrega</summary>
              <div className="p-3"><DeliveryForm id={row.id} patient={binding.user.fullName + ' · ' + binding.user.email} /></div>
            </details> : <p className="text-sm text-slate-700">Vincula una cuenta de prueba para entregar el resultado.</p>)}
            <details className="rounded-xl border border-slate-200">
              <summary className={disclosure}>Ver actividad</summary>
              <div className="space-y-3 px-4 pb-4 text-sm text-slate-700">
                <p className="break-all">Referencia del informe: {row.reportId}</p>
                <ul className="space-y-2">
                  {row.events.map(event => <li key={event.id}>{activityLabels[event.action] || 'Actividad registrada'} · {date(event.createdAt)}</li>)}
                </ul>
              </div>
            </details>
          </article>
        })}
      </section>
    </>}
  </section>
}
