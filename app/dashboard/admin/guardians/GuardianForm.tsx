'use client'
import { useActionState, type ReactNode } from 'react'
import type { GuardianState } from './actions'
export default function GuardianForm({ action, message, children }: { action: (state: GuardianState, data: FormData) => Promise<GuardianState>; message: string; children: ReactNode }) {
  const [state, formAction, pending] = useActionState(action, {})
  return <form action={formAction} onSubmit={event => { if (!window.confirm(message + '\n\n¿Confirmar?')) event.preventDefault() }} className="space-y-3">
    <fieldset disabled={pending} className="space-y-3">{children}<button className="min-h-12 rounded-xl bg-blue-700 px-4 py-3 text-white">{pending ? 'Guardando…' : 'Guardar cambio'}</button></fieldset>
    {state.error && <p role="alert" className="text-red-800">{state.error}</p>}{state.success && <p role="status" className="text-green-800">{state.success}</p>}
  </form>
}
