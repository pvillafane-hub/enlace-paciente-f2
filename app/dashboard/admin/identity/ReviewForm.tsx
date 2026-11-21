'use client'
import { useActionState } from 'react'
import { reviewIdentity } from './actions'
export default function ReviewForm({ id, candidates }: { id: string; candidates: { id: string; fullName: string; email: string }[] }) {
  const [state, action, pending] = useActionState(reviewIdentity.bind(null, id), {})
  return <form action={action} className="mt-5 space-y-4"><fieldset disabled={pending} className="space-y-4">
    <label className="block">Decisión<select name="decision" required className="block w-full rounded-xl border p-3"><option value="">Selecciona una decisión</option><option value="DISTINCT">Es otra persona: liberar cuenta nueva</option><option value="DUPLICATE">Es la misma persona: mantener registro duplicado bloqueado</option></select></label>
    <label className="block">Expediente existente (solo para duplicados)<select name="existingId" className="block w-full rounded-xl border p-3"><option value="">Selecciona si corresponde</option>{candidates.map(c => <option key={c.id} value={c.id}>{c.fullName} · {c.email} · {c.id}</option>)}</select></label>
    <label className="block">Motivo y referencia de validación<textarea name="reason" minLength={10} maxLength={1000} required className="block w-full rounded-xl border p-3" /></label><p>No escribas Seguro Social, documentos de identidad ni contraseñas.</p>
    <label className="flex gap-3 p-3"><input type="checkbox" name="contacted" required className="h-6 w-6 shrink-0" />Validé la identidad con el usuario y confirmo esta decisión.</label>
    <button className="min-h-12 rounded-xl bg-blue-700 p-3 text-white">{pending ? 'Guardando…' : 'Guardar decisión'}</button>
    </fieldset>{state.error && <p role="alert" className="text-red-800">{state.error}</p>}{state.success && <p role="status">{state.success}</p>}</form>
}
