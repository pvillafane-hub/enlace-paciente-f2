'use client'
import { useActionState, type ReactNode } from 'react'
import type { GuardianState } from './actions'
export default function GuardianForm({ action, message, children }: { action: (state: GuardianState, data: FormData) => Promise<GuardianState>; message: string; children: ReactNode }) {
  const [state, formAction, pending] = useActionState(action, {})
  return <form action={formAction} className="space-y-3">
    <fieldset disabled={pending} className="space-y-3">{children}
      <label className="flex min-h-12 items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4">
        <input type="checkbox" required className="mt-1 h-6 w-6 shrink-0" />
        <span><strong className="block">Confirmo este cambio</strong>{message}</span>
      </label>
      <button type="submit" className="min-h-12 rounded-xl bg-blue-700 px-4 py-3 text-white">{pending ? 'Guardando…' : 'Guardar cambio'}</button></fieldset>
    {state.error && <p role="alert" className="text-red-800">{state.error}</p>}{state.success && <p role="status" className="text-green-800">{state.success}</p>}
  </form>
}
