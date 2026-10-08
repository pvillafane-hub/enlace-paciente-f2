'use client'

import { useState, type FormEvent, type ReactNode } from 'react'
import { useFormStatus } from 'react-dom'

function PendingGuard({ children }: { children: ReactNode }) {
  const { pending } = useFormStatus()
  return <fieldset disabled={pending} aria-busy={pending}>{children}{pending && <p role="status" className="text-xs text-gray-600">Guardando cambio…</p>}</fieldset>
}

export default function ConfirmUserForm({ action, message, children, className }: {
  action: (data: FormData) => Promise<void>
  message: string
  children: ReactNode
  className?: string
}) {
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  function confirm(event: FormEvent<HTMLFormElement>) {
    const doctor = event.currentTarget.querySelector<HTMLSelectElement>('select[name="doctorId"]')
    const assignment = doctor ? `\nDoctor seleccionado: ${doctor.selectedOptions[0]?.textContent ?? ''}` : ''
    if (!window.confirm(`${message}${assignment}\n\n¿Confirmar cambio?`)) event.preventDefault()
  }
  async function submit(data: FormData) {
    setError('')
    setSaved(false)
    try { await action(data); setSaved(true) } catch {
      setError('No se pudo guardar el cambio. Actualiza la página y comprueba el estado antes de volver a intentarlo.')
    }
  }
  return <form action={submit} onSubmit={confirm} className={className}>
    <PendingGuard>{children}</PendingGuard>
    {saved && <p role="status" className="text-xs text-green-700">Cambio guardado.</p>}
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
  </form>
}
