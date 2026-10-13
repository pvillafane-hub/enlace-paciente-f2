'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { allergyState, UNKNOWN_PROFILE_VALUE, NO_KNOWN_ALLERGIES, type AllergyState } from '@/lib/patient-profile-policy'

type Profile = { dateOfBirth: string; bloodType: string; allergies: string }
export default function PatientClinicalForm({ initialData, canEdit }: { initialData: Profile; canEdit: boolean }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState(initialData)
  const [allergyChoice, setAllergyChoice] = useState<AllergyState>(allergyState(initialData.allergies))
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Puerto_Rico', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
  function changed() { setSaved(false); setDirty(true); setError('') }
  function field(key: keyof Profile, value: string) { changed(); setForm(prev => ({ ...prev, [key]: value })) }
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (loading || !canEdit) return
    if (!allergyChoice) { setError('Selecciona una opción para las alergias.'); return }
    if (allergyChoice === 'known' && !form.allergies.trim()) { setError('Escribe las alergias que conoces.'); return }
    setLoading(true); setSaved(false); setError('')
    try {
      const response = await fetch('/api/patient/update-info', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, allergyState: allergyChoice }) })
      const result = await response.json().catch(() => null)
      if (!response.ok) { setError(result?.error || 'No se pudo guardar. Tu información sigue en la pantalla.'); return }
      if (allergyChoice !== 'known') setForm(prev => ({ ...prev, allergies: allergyChoice === 'none' ? NO_KNOWN_ALLERGIES : UNKNOWN_PROFILE_VALUE }))
      setSaved(true); setDirty(false); router.refresh()
    } catch { setError('No se pudo conectar. Tu información sigue en la pantalla; verifica tu conexión e intenta nuevamente.') }
    finally { setLoading(false) }
  }
  return <section className="bg-white p-4 sm:p-6 rounded-2xl shadow space-y-6" aria-labelledby="profile-title">
    <h2 id="profile-title" className="text-2xl font-bold">Mi información de salud</h2>
    <p className="text-gray-700">Escribe lo que conoces. Si no sabes tu tipo de sangre o tus alergias, selecciona «No lo sé».</p>
    {!canEdit && <p role="status" className="rounded-xl border border-amber-300 bg-amber-50 p-4">Tu licencia está inactiva. Puedes consultar tu información; para modificarla necesitas una licencia activa.</p>}
    {saved && <p role="status" className="rounded-xl border border-green-300 bg-green-50 p-4 text-green-900">Tu información se guardó correctamente.</p>}
    {dirty && !loading && <p role="status" className="text-amber-900">Tienes cambios pendientes de guardar.</p>}
    {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">{error}</p>}
    <form onSubmit={handleSubmit} className="space-y-5">
      <fieldset disabled={loading || !canEdit} className="space-y-5 disabled:opacity-70">
        <legend className="sr-only">Datos personales de salud</legend>
        <div>
          <label htmlFor="profile-birth" className="block text-lg font-semibold">Fecha de nacimiento <span className="font-normal">(opcional)</span></label>
          <input id="profile-birth" type="date" value={form.dateOfBirth} min="1850-01-01" max={today} onChange={e => field('dateOfBirth', e.target.value)} className="mt-2 w-full border border-gray-400 p-3 text-lg rounded-xl" />
        </div>
        <div>
          <label htmlFor="profile-blood" className="block text-lg font-semibold">Tipo de sangre</label>
          <select id="profile-blood" value={form.bloodType} required onChange={e => field('bloodType', e.target.value)} aria-describedby="profile-blood-help" className="mt-2 w-full border border-gray-400 p-3 text-lg rounded-xl">
            <option value="">Selecciona una opción</option><option value={UNKNOWN_PROFILE_VALUE}>No lo sé</option>
            {['O+','O-','A+','A-','B+','B-','AB+','AB-'].map(value => <option key={value}>{value}</option>)}
          </select>
          <p id="profile-blood-help" className="mt-2 text-gray-700">Si no conoces este dato, no lo adivines.</p>
        </div>
        <fieldset className="space-y-3">
          <legend className="text-lg font-semibold">Alergias</legend>
          {([{ value: 'known', label: 'Tengo alergias' }, { value: 'none', label: 'No tengo alergias conocidas' }, { value: 'unknown', label: 'No lo sé' }] as const).map(option => <label key={option.value} className="flex items-center gap-3 rounded-xl border p-4 cursor-pointer">
            <input type="radio" name="allergy-choice" value={option.value} checked={allergyChoice === option.value} required onChange={() => { changed(); setAllergyChoice(option.value); if (option.value === 'known' && allergyState(form.allergies) !== 'known') setForm(prev => ({ ...prev, allergies: '' })) }} className="h-6 w-6 shrink-0" />{option.label}
          </label>)}
          {allergyChoice === 'known' && <div><label htmlFor="profile-allergies" className="block font-semibold">¿Cuáles son tus alergias?</label>
            <textarea id="profile-allergies" value={form.allergies} required maxLength={2000} rows={4} onChange={e => field('allergies', e.target.value)} aria-describedby="profile-allergies-help" className="mt-2 w-full border border-gray-400 p-3 text-lg rounded-xl" />
            <p id="profile-allergies-help">Por ejemplo: penicilina o un alimento. Describe lo que conoces.</p>
          </div>}
        </fieldset>
        <button type="submit" disabled={loading || !canEdit} className="bg-blue-700 text-white px-6 py-4 text-lg font-semibold rounded-xl w-full disabled:opacity-50">{loading ? 'Guardando…' : 'Guardar información'}</button>
      </fieldset>
    </form>
    <Link href="/dashboard" className="inline-flex min-h-12 items-center text-blue-800 underline">Volver al inicio</Link>
  </section>
}
