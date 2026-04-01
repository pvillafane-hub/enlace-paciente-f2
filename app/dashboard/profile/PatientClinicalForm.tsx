'use client'

import { useState } from "react"

export default function PatientClinicalForm({ initialData }: any) {

  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  const [form, setForm] = useState({
    dateOfBirth: initialData?.dateOfBirth || "",
    bloodType: initialData?.bloodType || "",
    allergies: initialData?.allergies || "",
  })

  async function handleSubmit(e: any) {
    e.preventDefault()

    setLoading(true)
    setSaved(false)

    try {
      const res = await fetch('/api/patient/update-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      if (res.ok) {
        setSaved(true)
      } else {
        alert("No se pudo guardar la información.")
      }

    } catch (error) {
      console.error(error)
      alert("Error inesperado.")
    }

    setLoading(false)
  }

  return (

    <div className="bg-white p-6 rounded-2xl shadow space-y-6">

      <h2 className="text-2xl font-bold">
        Ayúdenos a conocerle mejor
      </h2>

      <p className="text-gray-600">
        Esto ayuda a su médico a atenderle más rápido.
      </p>

      {saved && (
        <div className="bg-green-50 border border-green-300 text-green-800 p-3 rounded">
          ✔ Su información fue guardada correctamente
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">

        {/* FECHA */}
        <div>
          <label className="font-semibold">Fecha de nacimiento</label>
          <input
            type="date"
            value={form.dateOfBirth}
            onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
            className="w-full border p-3 rounded-lg"
          />
        </div>

        {/* SANGRE */}
        <div>
          <label className="font-semibold">Tipo de sangre</label>
          <select
            value={form.bloodType}
            onChange={(e) => setForm({ ...form, bloodType: e.target.value })}
            className="w-full border p-3 rounded-lg"
          >
            <option value="">Seleccione (opcional)</option>
            <option>O+</option>
            <option>O-</option>
            <option>A+</option>
            <option>A-</option>
            <option>B+</option>
            <option>B-</option>
            <option>AB+</option>
            <option>AB-</option>
          </select>
        </div>

        {/* ALERGIAS */}
        <div>
          <label className="font-semibold">Alergias</label>
          <textarea
            placeholder="Ej: Penicilina, polvo, alimentos (o escriba: Ninguna)"
            value={form.allergies}
            onChange={(e) => setForm({ ...form, allergies: e.target.value })}
            className="w-full border p-3 rounded-lg"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg w-full"
        >
          {loading ? "Guardando..." : "Guardar y continuar"}
        </button>

      </form>

    </div>
  )
}