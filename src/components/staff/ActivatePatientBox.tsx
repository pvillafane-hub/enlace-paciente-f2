'use client'

import { useState } from 'react'
import Link from 'next/link'

type Patient = { id: string; fullName: string; dateOfBirth: string | null }
export default function ActivatePatientBox({ enabled = true }: { enabled?: boolean }) {
  const [fullName, setFullName] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [holdMessage, setHoldMessage] = useState('')
  const [email, setEmail] = useState('')
  const [authorized, setAuthorized] = useState(false)
  const [loading, setLoading] = useState(false)
  const [stage, setStage] = useState<'search' | 'register' | 'done'>('search')
  const [matches, setMatches] = useState<Patient[] | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [selected, setSelected] = useState<Patient | null>(null)
  const [existing, setExisting] = useState(false)
  const [error, setError] = useState('')
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Puerto_Rico', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
  function birthLabel(value: string | null) {
    return value ? new Date(value).toLocaleDateString('es-PR', { timeZone: 'UTC' }) : 'Nacimiento no registrado'
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (loading || !enabled) return
    setLoading(true); setError('')
    try {
      const response = await fetch('/api/staff/create-patient', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intent: stage === 'search' ? 'search' : 'register', fullName, dateOfBirth, email, contactPhone, authorizationConfirmed: authorized }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'No se pudo completar la acción. Intenta nuevamente.')
      if (data.held) { setHoldMessage(data.message); setStage('done'); return }
      if (stage === 'search') { setMatches(data.patients); setHasMore(data.hasMore) }
      else { setSelected(data.patient); setExisting(data.existing); setStage('done') }
    } catch (error) { setError(error instanceof Error ? error.message : 'No se pudo completar la acción.') }
    finally { setLoading(false) }
  }
  function reset() {
    setContactPhone(''); setHoldMessage(''); setFullName(''); setDateOfBirth(''); setEmail(''); setAuthorized(false)
    setMatches(null); setSelected(null); setHasMore(false); setStage('search'); setError('')
  }
  return <section aria-labelledby="assisted-patient-title" className="rounded-2xl border bg-white p-6 shadow-sm space-y-5">
    <h2 id="assisted-patient-title" className="text-xl font-semibold text-gray-900">Registrar paciente asistido</h2>
    <p className="text-base text-gray-700">Ayuda al paciente sin exigirle correo, celular ni contraseña. Busca primero entre los pacientes autorizados de tu doctor.</p>
    {!enabled && <p role="status" className="rounded-xl bg-amber-50 p-4">El doctor necesita una licencia activa para registrar pacientes.</p>}
    {stage !== 'done' && <form onSubmit={submit} className="space-y-5">
      <fieldset disabled={loading || !enabled} className="space-y-5 disabled:opacity-60">
        <legend className="font-semibold mb-4">{stage === 'search' ? '1. Buscar al paciente' : '2. Confirmar datos y autorización'}</legend>
        <label className="block font-medium">Nombre completo <span className="font-normal">(obligatorio)</span>
          <input type="text" autoComplete="off" value={fullName} onChange={e => { setFullName(e.target.value); setMatches(null) }} minLength={2} maxLength={200} required className="mt-2 block w-full rounded-xl border border-gray-400 px-4 py-3 text-lg" />
        </label>
        <label className="block font-medium">Fecha de nacimiento <span className="font-normal">({stage === 'search' ? 'opcional para buscar' : 'obligatoria para registrar'})</span>
          <input type="date" value={dateOfBirth} onChange={e => { setDateOfBirth(e.target.value); setMatches(null) }} min="1850-01-01" max={today} required={stage === 'register'} className="mt-2 block w-full rounded-xl border border-gray-400 px-4 py-3 text-lg" />
        </label>
        {stage === 'register' && <>
          <label className="block font-medium">Teléfono del paciente o padre/tutor (opcional)<input type="tel" value={contactPhone} onChange={e => setContactPhone(e.target.value)} className="mt-2 block w-full rounded-xl border px-4 py-3 text-lg" /></label>
          <label className="block font-medium">Correo del paciente <span className="font-normal">(opcional)</span>
            <input type="email" autoComplete="off" value={email} onChange={e => setEmail(e.target.value)} maxLength={254} aria-describedby="assisted-email-help" className="mt-2 block w-full rounded-xl border border-gray-400 px-4 py-3 text-lg" />
          </label>
          <p id="assisted-email-help" className="text-gray-700">Si no tiene correo, déjalo vacío. No utilices el correo de la empleada ni de otro paciente.</p>
          <label className="flex items-start gap-3 rounded-xl border p-4 cursor-pointer">
            <input type="checkbox" checked={authorized} onChange={e => setAuthorized(e.target.checked)} required className="mt-1 h-6 w-6 shrink-0" />
            <span>Confirmo que el paciente autorizó crear su expediente y compartirlo con este doctor. Mi confirmación quedará registrada.</span>
          </label>
          <p className="text-gray-700">Se crea el expediente asistido. El acceso personal del paciente y su licencia no se activan con este registro.</p>
        </>}
        <div className="flex flex-wrap gap-3">
          <button type="submit" className="min-h-12 rounded-xl bg-blue-700 px-5 py-3 text-lg font-semibold text-white disabled:opacity-50">{loading ? 'Procesando…' : stage === 'search' ? 'Buscar paciente' : 'Registrar paciente'}</button>
          {stage === 'register' && <button type="button" onClick={() => { setStage('search'); setAuthorized(false) }} className="min-h-12 rounded-xl border px-5 py-3">Volver a buscar</button>}
        </div>
      </fieldset>
    </form>}
    {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">{error}</p>}
    {stage === 'search' && matches !== null && <div aria-live="polite" className="space-y-4">
      <p>{matches.length ? 'Revisa el nombre y nacimiento antes de seleccionar.' : 'No encontramos coincidencias entre los pacientes autorizados de tu doctor. Esto no descarta una cuenta en otra clínica.'}</p>
      {matches.map(patient => <button key={patient.id} disabled={loading || !enabled} type="button" onClick={() => { setSelected(patient); setExisting(true); setStage('done'); setError('') }} className="block w-full rounded-xl border border-blue-300 p-4 text-left hover:bg-blue-50">
        <span className="block text-lg font-semibold">{patient.fullName}</span><span className="block">{birthLabel(patient.dateOfBirth)}</span><span className="block mt-2 text-blue-800">Seleccionar este paciente</span>
      </button>)}
      {hasMore && <p>Hay más coincidencias. Añade la fecha de nacimiento o un nombre más completo para afinar la búsqueda.</p>}
      <button type="button" disabled={!enabled || loading} onClick={() => { setStage('register'); setError('') }} className="min-h-12 rounded-xl border px-5 py-3 text-lg">{matches.length ? 'No es ninguno · Registrar nuevo paciente' : 'Registrar nuevo paciente'}</button>
    </div>}
    {holdMessage && <div role="status" className="rounded-xl bg-amber-50 p-5"><p>{holdMessage}</p><p>Admin recibió una revisión pendiente. No cargues documentos ni crees otra cuenta.</p><button type="button" onClick={reset} className="min-h-12 underline">Atender otro paciente</button></div>}
    {stage === 'done' && selected && <div className="space-y-4">
      <div role="status" className="rounded-xl border border-green-300 bg-green-50 p-5 text-green-950">
        <p className="font-semibold text-lg">{existing ? 'Expediente existente seleccionado' : 'Paciente registrado'}</p>
        <p className="text-lg">{selected.fullName}</p><p>{birthLabel(selected.dateOfBirth)}</p>
        <p className="mt-3">Confirma que corresponde al paciente antes de subir documentos.</p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Link href={`/dashboard/upload?patientId=${selected.id}`} className="min-h-12 rounded-xl bg-blue-700 px-5 py-3 text-lg font-semibold text-white">{existing ? 'Subir documento' : 'Subir primer documento'}</Link>
        <Link href="/dashboard/patients" className="min-h-12 rounded-xl border px-5 py-3 text-lg">Terminar</Link>
        <button type="button" onClick={reset} className="min-h-12 px-5 py-3 underline">Atender otro paciente</button>
      </div>
    </div>}
  </section>
}
