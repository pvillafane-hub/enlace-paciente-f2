'use client'

import { useActionState, useState, type FormEvent } from 'react'
import type { LicenseActionState } from '@/lib/admin-license-policy'

type Props = {
  action: (state: LicenseActionState, data: FormData) => Promise<LicenseActionState>
  mode: 'create' | 'modify' | 'disable'
  target?: string
  initial?: { plan: string | null; status: string; validUntil: string; unlimited: boolean }
}
export default function LicenseForm({ action, mode, target, initial }: Props) {
  const [state, submit, pending] = useActionState(action, {})
  const [unlimited, setUnlimited] = useState(initial?.unlimited ?? false)
  function confirm(event: FormEvent<HTMLFormElement>) {
    const data = new FormData(event.currentTarget)
    const account = target || String(data.get('email') || '')
    const details = mode === 'disable'
      ? 'Se desactivarán las licencias de esta cuenta. No se elimina la cuenta ni sus documentos.'
      : `Plan: ${data.get('plan')}. Estado: ${data.get('status')}. Vencimiento: ${unlimited ? 'Sin vencimiento' : data.get('validUntil')}.`
    if (!window.confirm(`${mode === 'create' ? 'Crear' : mode === 'modify' ? 'Modificar' : 'Desactivar'} licencia de ${account}.\n${details}\nMotivo: ${data.get('reason')}\n\nEste cambio es manual: no realiza un cobro ni registra un pago.\n¿Confirmar?`)) event.preventDefault()
  }
  return <form action={submit} onSubmit={confirm} className="space-y-3">
    <fieldset disabled={pending} aria-busy={pending} className="space-y-3">
      {mode === 'create' && <label className="block">Correo de la cuenta existente<input name="email" type="email" required maxLength={254} autoComplete="off" className="block w-full border rounded px-3 py-2" /></label>}
      {mode !== 'disable' && <>
        <div className="grid sm:grid-cols-2 gap-3">
          <label>Plan<select name="plan" defaultValue={initial?.plan === 'BASIC' ? 'BASIC' : 'PRO'} className="block w-full border rounded px-3 py-2"><option value="BASIC">Básico</option><option value="PRO">PRO</option></select></label>
          <label>Estado<select name="status" defaultValue={initial?.status === 'INACTIVE' || initial?.status === 'TRIAL' ? 'INACTIVE' : 'ACTIVE'} className="block w-full border rounded px-3 py-2"><option value="ACTIVE">Activa</option><option value="INACTIVE">Desactivada</option></select></label>
        </div>
        <label className="block">Fecha de vencimiento (hora de Puerto Rico)<input name="validUntil" type="date" defaultValue={initial?.validUntil} required={!unlimited} disabled={unlimited} className="block w-full border rounded px-3 py-2" /></label>
        <label className="flex gap-2 items-center"><input name="unlimited" type="checkbox" checked={unlimited} onChange={event => setUnlimited(event.target.checked)} />Sin vencimiento</label>
      </>}
      <label className="block">Motivo del cambio<textarea name="reason" required minLength={5} maxLength={500} rows={2} placeholder="Ej.: cortesía, prueba autorizada o renovación manual" className="block w-full border rounded px-3 py-2" /></label>
      <button type="submit" className={`px-4 py-2 rounded text-white disabled:opacity-50 ${mode === 'disable' ? 'bg-red-700' : 'bg-blue-700'}`}>{pending ? 'Guardando…' : mode === 'create' ? 'Crear licencia' : mode === 'modify' ? 'Guardar cambios' : 'Desactivar licencias de la cuenta'}</button>
    </fieldset>
    {state.error && <p role="alert" className="text-red-700">{state.error}</p>}
    {state.success && <p role="status" className="text-green-800">{state.success}</p>}
  </form>
}
