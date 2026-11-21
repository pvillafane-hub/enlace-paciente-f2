'use client'
import { useActionState, useEffect, useRef, useState } from 'react'
import { saveIntegration } from './actions'
import { authLabels, directionLabels, emptyIntegration, preparationIssues, protocolLabels, type IntegrationValues } from '@/lib/integrations/policy'

type Record = IntegrationValues & { id: string; version: number }
const input = 'mt-2 block min-h-12 w-full min-w-0 rounded-xl border border-slate-300 bg-white p-3 text-lg'
export default function IntegrationForm({ record }: { record?: Record }) {
  const [values, setValues] = useState<IntegrationValues>(record || { ...emptyIntegration })
  const [confirmed, setConfirmed] = useState(false)
  const feedback = useRef<HTMLDivElement>(null)
  const [state, action, pending] = useActionState(async (previous: { error?: string; success?: string }, data: FormData) => {
    const result = await saveIntegration(record?.id || null, record?.version || null, previous, data)
    if (result.success) { setConfirmed(false); if (!record) setValues({ ...emptyIntegration }) }
    return result
  }, {})
  useEffect(() => { if (state.error || state.success) feedback.current?.focus() }, [state])
  function field<K extends keyof IntegrationValues>(key: K, value: IntegrationValues[K]) { setValues(previous => ({ ...previous, [key]: value })) }
  const issues = preparationIssues(values)
  return <form action={action} className="min-w-0 space-y-5" aria-busy={pending}><fieldset disabled={pending} className="min-w-0 space-y-5">
    <div className="grid min-w-0 gap-5 md:grid-cols-2">
      <label className="block font-semibold">Nombre del laboratorio<input className={input} name="name" value={values.name} onChange={e => field('name', e.target.value)} required minLength={3} maxLength={120} placeholder="Laboratorio de prueba" /></label>
      <label className="block font-semibold">Código de pruebas<input className={input} name="code" value={values.code} onChange={e => field('code', e.target.value.toUpperCase())} required maxLength={64} pattern="TEST-[A-Z0-9-]{1,59}" placeholder="TEST-LAB-02" /><span className="mt-1 block text-sm font-normal text-slate-600">Único por laboratorio. Empieza con TEST-.</span></label>
      <label className="block font-semibold">Formato de intercambio<select className={input} name="protocol" value={values.protocol} onChange={e => field('protocol', e.target.value as IntegrationValues['protocol'])}>{Object.entries(protocolLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      <label className="block font-semibold">Dirección prevista<select className={input} name="direction" value={values.direction} onChange={e => field('direction', e.target.value as IntegrationValues['direction'])}>{Object.entries(directionLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
    </div>
    <div className="rounded-xl bg-blue-50 p-4 text-blue-950"><p className="font-semibold">{values.protocol === 'HL7_V2' ? 'Perfil de referencia: HL7 v2.5.1 · ORU R01' : values.protocol === 'FHIR_R4' ? 'Perfil de referencia: FHIR R4 · Bundle de laboratorio limitado' : 'Perfil de referencia: API JSON · resultados finales numéricos'}</p><p className="mt-2">{values.protocol === 'HL7_V2' ? 'Debemos acordar el transporte con el laboratorio. Esta pantalla no abre un servidor MLLP ni una conexión de red.' : 'La compatibilidad y el mecanismo de conexión deben validarse con el laboratorio.'}</p></div>
    <label className="block font-semibold">Dirección HTTPS del sistema del laboratorio<input className={input} type="url" name="endpoint" value={values.endpoint} onChange={e => field('endpoint', e.target.value)} maxLength={500} placeholder="https://sistema-del-laboratorio.example/api" /><span className="mt-1 block font-normal text-slate-600">{values.direction === 'OUTBOUND' ? 'Necesaria antes de preparar una consulta al laboratorio.' : 'Opcional para documentar su sistema. La dirección para enviar a Enlace Salud se asignará al validar el conector.'} No incluyas tokens ni contraseñas en la dirección.</span></label>
    <div className="grid min-w-0 gap-5 md:grid-cols-2">
      <label className="block font-semibold">Autenticación prevista<select className={input} name="authType" value={values.authType} onChange={e => field('authType', e.target.value as IntegrationValues['authType'])}>{Object.entries(authLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      <label className="block font-semibold">Referencia segura de la credencial<input className={input} name="credentialRef" value={values.credentialRef} onChange={e => field('credentialRef', e.target.value)} maxLength={200} placeholder="secret:laboratorio-pruebas/credencial" autoComplete="off" /><span className="mt-1 block font-normal text-slate-600">Usa env:NOMBRE o secret:referencia. El secreto se configura por un canal seguro; no pegues aquí su valor.</span></label>
    </div>
    <section className="space-y-3 rounded-xl border p-4"><h3 className="text-xl font-semibold">Reglas previstas para la integración</h3><p>Una identidad que no coincida se envía a revisión. Se conserva el resultado original. Los reenvíos y conflictos se controlan antes de la entrega.</p><label className="flex min-h-12 items-start gap-3"><input className="mt-1 h-6 w-6 shrink-0" type="checkbox" name="reviewAll" checked={values.reviewAll} onChange={e => field('reviewAll', e.target.checked)} /><span>Solicitar revisión manual de todos los resultados antes de entregarlos.</span></label><p className="text-sm text-slate-600">Esta preferencia se aplicará al implementar y validar el conector. Guardarla no modifica la bandeja actual.</p></section>
    <label className="block font-semibold">Notas de coordinación<textarea className={input} name="notes" value={values.notes} onChange={e => field('notes', e.target.value)} maxLength={1000} rows={3} /><span className="mt-1 block font-normal text-slate-600">Sin datos de pacientes, documentos clínicos ni credenciales.</span></label>
    <label className="block font-semibold">Estado de la ficha<select className={input} name="status" value={values.status} onChange={e => field('status', e.target.value as IntegrationValues['status'])}><option value="DRAFT">Borrador</option><option value="PAUSED">Pausada</option></select></label>
    <div className="rounded-xl border border-amber-300 bg-amber-50 p-4"><p className="font-semibold">Revisión de datos de configuración</p>{issues.length ? <ul className="mt-2 list-disc space-y-2 pl-6">{issues.map(issue => <li key={issue}>{issue}</li>)}</ul> : <p className="mt-2">Los datos básicos están completos para revisión técnica. Las credenciales y la conexión aún no han sido comprobadas.</p>}<p className="mt-2">Puedes guardar un borrador incompleto para continuar después.</p></div>
    <label className="flex min-h-12 items-start gap-3"><input type="checkbox" name="confirmed" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} required className="mt-1 h-6 w-6 shrink-0" /><span>Confirmo que esta ficha es para pruebas. Guardarla no conecta el laboratorio ni habilita datos clínicos reales.</span></label>
    <button disabled={pending} className="min-h-12 rounded-xl bg-blue-700 px-5 py-3 text-lg font-semibold text-white">{pending ? 'Guardando…' : record ? 'Guardar cambios' : 'Guardar laboratorio'}</button>
  </fieldset><div ref={feedback} tabIndex={-1} className="rounded-lg focus:outline focus:outline-2 focus:outline-blue-700">{state.error && <p role="alert" className="text-red-800">{state.error} Los datos se conservan.</p>}{state.success && <p role="status" className="text-green-800">{state.success}</p>}</div></form>
}
