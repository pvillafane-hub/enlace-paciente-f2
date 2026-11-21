'use client'

import { useState } from 'react'

type SectionKey = 'allergies' | 'medicalConditions' | 'surgeries'
const OPTIONS: Record<SectionKey, string[]> = {
  allergies: ['Penicilina', 'Otros medicamentos', 'Alimentos', 'Látex', 'Polvo', 'Polen', 'Picaduras de insectos'],
  medicalConditions: ['Diabetes', 'Hipertensión', 'Asma', 'Enfermedades cardíacas', 'Colesterol alto', 'Problemas de tiroides', 'Artritis'],
  surgeries: ['Apéndice', 'Vesícula', 'Cesárea', 'Hernia', 'Rodilla', 'Cadera', 'Corazón'],
}
const PREFIX = '[Seleccionado] '
const NONE = 'Ninguna conocida'
function parseSaved(value: string) {
  const lines = value.split('\n')
  const selected: string[] = []
  const notes: string[] = []
  for (const line of lines) {
    if (line.startsWith(PREFIX)) selected.push(line.slice(PREFIX.length))
    else notes.push(line)
  }
  return { selected, notes: notes.join('\n').trim() }
}
function serialize(selected: string[], notes: string) {
  return [...selected.map(value => PREFIX + value), notes.trim()].filter(Boolean).join('\n')
}
export default function PatientClinicalForm({ initialData }: { initialData?: Record<string, string> }) {
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [dateOfBirth, setDateOfBirth] = useState(initialData?.dateOfBirth || '')
  const [bloodType, setBloodType] = useState(initialData?.bloodType || '')
  const [sections, setSections] = useState<Record<SectionKey, { selected: string[], notes: string }>>(() => ({
    allergies: parseSaved(initialData?.allergies || ''),
    medicalConditions: parseSaved(initialData?.medicalConditions || ''),
    surgeries: parseSaved(initialData?.surgeries || ''),
  }))
  function toggle(key: SectionKey, option: string) {
    setSaved(false)
    setSections(previous => {
      const current = previous[key].selected
      const selected = current.includes(option)
        ? current.filter(value => value !== option)
        : option === NONE ? [NONE] : [...current.filter(value => value !== NONE), option]
      return { ...previous, [key]: { ...previous[key], selected } }
    })
  }
  function changeNotes(key: SectionKey, notes: string) {
    setSaved(false)
    setSections(previous => ({ ...previous, [key]: { ...previous[key], notes } }))
  }
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setSaved(false)
    try {
      const payload = {
        dateOfBirth, bloodType,
        allergies: serialize(sections.allergies.selected, sections.allergies.notes),
        medicalConditions: serialize(sections.medicalConditions.selected, sections.medicalConditions.notes),
        surgeries: serialize(sections.surgeries.selected, sections.surgeries.notes),
      }
      const response = await fetch('/api/patient/update-info', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      })
      if (response.ok) setSaved(true)
      else alert('No se pudo guardar la información.')
    } catch {
      alert('Error inesperado.')
    } finally {
      setLoading(false)
    }
  }
  function section(key: SectionKey, title: string, placeholder: string) {
    return <fieldset className="rounded-xl border border-gray-200 p-4 space-y-3">
      <legend className="px-1 text-lg font-semibold">{title}</legend>
      <p className="text-sm text-gray-600">Marque las opciones que correspondan o escriba su información debajo.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {[...OPTIONS[key], NONE].map(option => <label key={option} className="flex items-start gap-2 rounded-lg border border-gray-100 p-2 cursor-pointer">
          <input type="checkbox" className="mt-1 h-4 w-4" checked={sections[key].selected.includes(option)} onChange={() => toggle(key, option)} />
          <span>{option}</span>
        </label>)}
      </div>
      <label htmlFor={key + '-notes'} className="block font-medium">Información adicional (texto abierto)</label>
      <textarea id={key + '-notes'} rows={3} maxLength={9000} placeholder={placeholder} value={sections[key].notes}
        onChange={e => changeNotes(key, e.target.value)} className="w-full rounded-lg border p-3" />
    </fieldset>
  }
  return <div className="bg-white p-6 rounded-2xl shadow space-y-6">
    <h2 className="text-2xl font-bold">Mi información médica</h2>
    <p className="text-gray-600">Esta información ayuda a sus médicos a conocer mejor su historial. Puede actualizarla cuando sea necesario.</p>
    {saved && <div role="status" className="bg-green-50 border border-green-300 text-green-800 p-3 rounded">✔ Su información fue guardada correctamente</div>}
    <form onSubmit={handleSubmit} className="space-y-5">
      <div><label htmlFor="dateOfBirth" className="block font-semibold">Fecha de nacimiento</label>
        <input id="dateOfBirth" type="date" value={dateOfBirth} onChange={e => setDateOfBirth(e.target.value)} className="w-full border p-3 rounded-lg" /></div>
      <div><label htmlFor="bloodType" className="block font-semibold">Tipo de sangre</label>
        <select id="bloodType" value={bloodType} onChange={e => setBloodType(e.target.value)} className="w-full border p-3 rounded-lg">
          <option value="">Seleccione (opcional)</option>
          {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map(type => <option key={type}>{type}</option>)}
        </select></div>
      {section('allergies', 'Alergias', 'Describa alergias, reacciones u otros detalles (opcional)')}
      {section('medicalConditions', 'Condiciones y padecimientos', 'Describa otras condiciones, fechas u observaciones (opcional)')}
      {section('surgeries', 'Cirugías', 'Indique procedimientos, fechas u observaciones (opcional)')}
      <button type="submit" disabled={loading} className="bg-blue-600 text-white px-6 py-3 rounded-lg w-full disabled:opacity-60">
        {loading ? 'Guardando...' : 'Guardar información médica'}
      </button>
    </form>
  </div>
}
