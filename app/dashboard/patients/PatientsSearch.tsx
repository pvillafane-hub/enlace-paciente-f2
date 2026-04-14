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

  // 🔥 ORDENAR POR PRIORIDAD
  const sorted = [...filtered].sort(
    (a, b) => b.riskScore - a.riskScore
  )

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

        {sorted.map((p) => {

          const isHighNeed = p.riskScore >= 70

          let diffDays = null

          if (p.lastDoc?.createdAt) {
            const now = Date.now()
            diffDays = Math.floor(
              (now - new Date(p.lastDoc.createdAt).getTime()) /
              (1000 * 60 * 60 * 24)
            )
          }

          return (

            <div
              key={p.id}
              className={`border rounded-xl p-5 flex justify-between items-start transition ${
                isHighNeed
                  ? "border-l-4 border-amber-500 bg-amber-50"
                  : "bg-white hover:shadow-md"
              }`}
            >

              {/* 🧑 INFO */}
              <div className="space-y-1">

                <p className="text-lg font-semibold">
                  {p.fullName}
                </p>

                <p className="text-sm text-gray-500">
                  {p.email}
                </p>

                {/* 🔥 BADGE ALTA NECESIDAD */}
                {isHighNeed && (
                  <span className="inline-block text-xs font-semibold text-amber-800 bg-amber-100 px-2 py-1 rounded mt-1">
                    Paciente de alta necesidad
                  </span>
                )}

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

                    {diffDays !== null && (
                      <p className="text-xs text-gray-500">
                        hace {diffDays} días
                      </p>
                    )}

                  </div>
                ) : (
                  <p className="text-sm text-gray-400 mt-2">
                    Sin información clínica disponible
                  </p>
                )}

              </div>

              {/* 🚀 ACCIÓN */}
              <div className="pt-1">
                <Link
                  href={`/dashboard/patients/${p.id}`}
                  className="text-blue-600 hover:underline text-sm"
                >
                  Ver expediente →
                </Link>
              </div>

            </div>

          )
        })}

        {sorted.length === 0 && (
          <p className="text-gray-500">
            No se encontraron pacientes.
          </p>
        )}

      </div>

    </div>

  )
}