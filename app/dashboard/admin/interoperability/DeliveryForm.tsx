'use client'
import { useActionState } from 'react'
import { bindInterop, deliverInterop } from './actions'
export function BindingForm({ candidates }: { candidates: { id: string; fullName: string; email: string }[] }) {
  const [state, action, pending] = useActionState(bindInterop, {})
  return <form action={action} className="space-y-4"><fieldset disabled={pending} className="space-y-4">
    <label className="block font-semibold">Cuenta ficticia<select name="userId" required className="mt-2 block min-h-12 w-full rounded-xl border p-3"><option value="">Selecciona</option>{candidates.map(user => <option key={user.id} value={user.id}>{user.fullName} · {user.email}</option>)}</select></label>
    <label className="block font-semibold">Motivo de vinculación<textarea name="reason" required minLength={10} maxLength={1000} className="mt-2 block w-full rounded-xl border p-3" /></label>
    <label className="flex gap-3"><input type="checkbox" name="confirmed" required className="h-6 w-6 shrink-0" />Confirmo que es una cuenta ficticia de TEST-PATIENT-001, nacido el 2018-04-12. La vinculación no se puede reasignar desde esta pantalla.</label>
    <button className="min-h-12 rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white">{pending ? 'Vinculando…' : 'Vincular paciente ficticio'}</button>
  </fieldset>{state.error && <p role="alert" className="text-red-800">{state.error}</p>}{state.success && <p role="status">{state.success}</p>}</form>
}
export function DeliveryForm({ id, patient }: { id: string; patient: string }) {
  const [state, action, pending] = useActionState(deliverInterop.bind(null,id), {})
  return <form action={action} className="space-y-4 rounded-xl border p-4"><h4 className="text-lg font-semibold">Entregar al expediente de pruebas</h4><p>Destino: {patient}. Se necesita licencia activa del paciente.</p><fieldset disabled={pending} className="space-y-4">
    <label className="flex gap-3"><input type="checkbox" name="proxyVisible" className="h-6 w-6 shrink-0" />Permitir que representantes autorizados consulten este resultado ficticio.</label>
    <label className="flex gap-3"><input type="checkbox" name="confirmed" required className="h-6 w-6 shrink-0" />Confirmo el destino y la entrega de este resultado ficticio.</label>
    <button className="min-h-12 rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white">{pending ? 'Entregando…' : 'Entregar resultado ficticio'}</button>
  </fieldset>{state.error && <p role="alert" className="text-red-800">{state.error}</p>}{state.success && <p role="status">{state.success}</p>}</form>
}
