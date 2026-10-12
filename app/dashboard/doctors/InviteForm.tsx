'use client'
import { useActionState } from 'react'
import { inviteDoctorWithFeedback } from './actions'

export default function InviteForm() {
  const [state, action, pending] = useActionState(inviteDoctorWithFeedback, { error: '', success: '' })
  return <form action={action} className="space-y-3">
    <fieldset disabled={pending} className="flex flex-col md:flex-row gap-3">
      <label className="flex-1">Email del doctor<input type="email" name="email" required className="block border rounded-lg px-4 py-3 w-full" /></label>
      <button className="bg-blue-600 text-white px-5 py-3 rounded-lg">{pending ? 'Enviando…' : 'Enviar invitación'}</button>
    </fieldset>
    {state.error && <p role="alert" className="text-red-700">{state.error}</p>}
    {state.success && <p role="status" className="text-green-800">{state.success}</p>}
  </form>
}
