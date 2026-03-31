"use client"

import { useState } from "react"
import Link from "next/link"

interface Patient {
  id: string
  fullName: string
  email: string
  riskScore: number
  lastDoc: {
    docType: string
    facility: string
    studyDate: string
    createdAt: string
  } | null
}

export default function PatientsSearch({ patients }: { patients: Patient[] }) {

  const [query, setQuery] = useState("")

  const filtered = patients.filter(p =>
    p.fullName.toLowerCase().includes(query.toLowerCase()) ||
    p.email.toLowerCase().includes(query.toLowerCase())
  )

  // 🔥 ORDENAR POR RIESGO (ALTO → BAJO)
  const sorted = [...filtered].sort(
    (a, b) => b.riskScore - a.riskScore
  )

  // 🎨 COLOR DEL SCORE
  const getRiskColor = (score: number) => {
    if (score >= 70) return "bg-red-500"
    if (score >= 30) return "bg-yellow-500"
    return "bg-green-500"
  }

  // 🏷 LABEL DEL SCORE
  const getRiskLabel = (score: number) => {
    if (score >= 70) return "Alto"
    if (score >= 30) return "Medio"
    return "Bajo"
  }

  return (

    <div className="space-y-6">

      {/* 🔍 SEARCH */}

      <input
        type="text"
        placeholder="Buscar paciente..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full border rounded-lg px-4 py-3"
      />

      {/* 📋 LIST */}

      <div className="space-y-4">

        {sorted.map((p) => (

          <div
            key={p.id}
            className="bg-white border rounded-xl p-5 flex justify-between items-center hover:shadow-md transition"
          >

            {/* 🧑 INFO */}
            <div className="space-y-2">

              <p className="text-lg font-semibold">
                {p.fullName}
              </p>

              <p className="text-sm text-gray-500">
                {p.email}
              </p>

              {/* 🔥 SCORE VISUAL */}
              <div className="mt-3 w-52">

                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium">
                    {getRiskLabel(p.riskScore)}
                  </span>
                  <span>{p.riskScore}</span>
                </div>

                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${getRiskColor(p.riskScore)}`}
                    style={{ width: `${p.riskScore}%` }}
                  />
                </div>

              </div>

              {/* 🔥 ÚLTIMO DOCUMENTO */}
              {p.lastDoc ? (
                <div className="text-sm mt-2 space-y-1">

                  <p>
                    <span className="font-medium">Último estudio:</span>{" "}
                    {p.lastDoc.docType}
                  </p>

                  <p className="text-gray-500">
                    {p.lastDoc.facility} ·{" "}
                    {new Date(p.lastDoc.studyDate).toLocaleDateString()}
                  </p>

                </div>
              ) : (
                <p className="text-sm text-gray-400 mt-2">
                  Sin documentos registrados
                </p>
              )}

            </div>

            {/* 🚀 ACCIÓN */}
            <div className="flex flex-col items-end gap-3">

              <Link
                href={`/dashboard/patients/${p.id}`}
                className="text-blue-600 hover:underline text-sm"
              >
                Ver expediente →
              </Link>

            </div>

          </div>

        ))}

        {sorted.length === 0 && (

          <p className="text-gray-500">
            No se encontraron pacientes.
          </p>

        )}

      </div>

    </div>

  )
}