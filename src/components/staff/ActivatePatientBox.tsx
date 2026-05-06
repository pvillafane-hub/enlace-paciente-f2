"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export default function ActivatePatientBox() {
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    setLoading(true)
    setMessage("")
    setError("")

    try {
      const res = await fetch("/api/staff/create-patient", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName,
          email,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "No se pudo activar el paciente")
      }

      setMessage(`Paciente activado: ${data.patient.fullName}`)
      setFullName("")
      setEmail("")

      router.push(`/dashboard/patients/${data.patient.id}`)
      
    } catch (err: any) {
      setError(err.message || "Error activando paciente")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900">
        Activar paciente
      </h2>

      <p className="mt-1 text-sm text-gray-600">
        Crea un paciente desde la clínica sin que el paciente tenga que usar tecnología.
      </p>

      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        <input
          type="text"
          placeholder="Nombre completo del paciente"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="w-full rounded-xl border px-4 py-2 text-sm"
          required
        />

        <input
          type="email"
          placeholder="Email del paciente (opcional)"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-xl border px-4 py-2 text-sm"
        />

        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {loading ? "Activando..." : "+ Activar paciente"}
        </button>
      </form>

      {message && (
        <p className="mt-3 rounded-xl bg-green-50 p-3 text-sm text-green-700">
          {message}
        </p>
      )}

      {error && (
        <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  )
}