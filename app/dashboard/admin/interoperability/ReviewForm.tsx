'use client'
import { useActionState } from 'react'
import { reviewInterop } from './actions'
export default function ReviewForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState(reviewInterop.bind(null, id), {})
  return <form action={action} className="space-y-4 rounded-xl border p-4">
    <h4 className="text-lg font-semibold">Revisar identificación ficticia</h4>
    <p>Compara los datos recibidos con TEST-PATIENT-001, nacido el 2018-04-12. Documenta cómo verificaste la discrepancia antes de confirmar.</p>
    <fieldset disabled={pending} className="space-y-4">
      <label className="block font-semibold">Decisión<select name="decision" required className="mt-2 block min-h-12 w-full rounded-xl border p-3"><option value="">Selecciona</option><option value="MANUALLY_MATCHED">Confirmar identidad ficticia</option><option value="REJECTED">Rechazar identificación</option></select></label>
      <label className="block font-semibold">Paciente de prueba (para confirmar)<select name="patientId" className="mt-2 block min-h-12 w-full rounded-xl border p-3"><option value="">Selecciona si vas a confirmar</option><option value="TEST-PATIENT-001">TEST-PATIENT-001 · 2018-04-12</option></select></label>
      <label className="block font-semibold">Motivo y referencia de validación<textarea name="reason" required minLength={10} maxLength={1000} className="mt-2 block min-h-28 w-full rounded-xl border p-3" /></label>
      <p>Usa solo información ficticia. No incluyas contraseñas ni identificadores reales.</p>
      <label className="flex items-start gap-3"><input name="confirmed" type="checkbox" required className="mt-1 h-6 w-6 shrink-0" />Revisé la discrepancia y confirmo la decisión. Esta acción cierra la revisión del recibo.</label>
      <button className="min-h-12 rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white">{pending ? 'Guardando decisión…' : 'Guardar decisión'}</button>
    </fieldset>
    {state.error && <p role="alert" className="text-red-800">{state.error}</p>}
    {state.success && <p role="status" className="text-green-900">{state.success}</p>}
  </form>
}
