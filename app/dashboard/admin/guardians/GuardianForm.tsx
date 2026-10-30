'use client'
import { startTransition, useActionState, useEffect, useRef, type FormEvent, type ReactNode } from 'react'
import type { GuardianState } from './actions'

export default function GuardianForm({ action, message, children }: { action: (state: GuardianState, data: FormData) => Promise<GuardianState>; message: string; children: ReactNode }) {
  const [state, formAction, pending] = useActionState(action, {})
  const form = useRef<HTMLFormElement>(null)
  const feedback = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (state.success) form.current?.reset()
    if (state.error || state.success) feedback.current?.focus()
  }, [state])

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    const element = event.currentTarget
    const data = new FormData(element)
    if (data.get('status') === 'ACTIVE') {
      const required = [
        ['authorityVerified', 'Marca la verificación de identidad y autoridad del representante.'],
        ['minorVerified', 'Marca la confirmación de que el paciente es menor.'],
        ['validUntil', 'Selecciona una fecha de vencimiento o próxima revisión.'],
      ]
      for (const [name, error] of required) {
        const input = element.elements.namedItem(name)
        if (input instanceof HTMLInputElement) input.setCustomValidity((input.type === 'checkbox' ? !input.checked : !input.value) ? error : '')
      }
      if (!element.reportValidity()) return
    }
    // Dispatch manually so a rejected action does not reset uncontrolled fields.
    startTransition(() => formAction(data))
  }
  function clearValidation() {
    if (!form.current) return
    for (const input of Array.from(form.current.elements)) if (input instanceof HTMLInputElement) input.setCustomValidity('')
  }
  return <form ref={form} onSubmit={submit} onChange={clearValidation} className="min-w-0 space-y-3" aria-busy={pending}>
    <fieldset disabled={pending} className="min-w-0 space-y-3">{children}
      <label className="flex min-h-12 items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4">
        <input type="checkbox" required className="mt-1 h-6 w-6 shrink-0" />
        <span className="min-w-0 break-words"><strong className="block">Confirmo este cambio</strong>{message}</span>
      </label>
      <button type="submit" disabled={pending} className="min-h-12 rounded-xl bg-blue-700 px-4 py-3 text-white">{pending ? 'Guardando…' : 'Guardar cambio'}</button>
    </fieldset>
    <div ref={feedback} tabIndex={-1} className="rounded-lg focus:outline focus:outline-2 focus:outline-blue-700">{state.error && <p role="alert" className="text-red-800">{state.error} Tus datos se conservaron; corrige lo indicado y vuelve a guardar.</p>}{state.success && <p role="status" className="text-green-800">{state.success}</p>}</div>
  </form>
}
