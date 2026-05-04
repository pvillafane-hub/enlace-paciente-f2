'use client'

import { useState } from 'react'

export default function ActivitySearch({ documents }: any) {

  const [query, setQuery] = useState("")

  const filtered = documents.filter((doc: any) => {

    const text =
      (doc.user?.fullName || "") +
      " " +
      (doc.docType || "") +
      " " +
      (doc.specialty || "") +
      " " +
      (doc.bodyPart || "")

    return text.toLowerCase().includes(query.toLowerCase())

  })

  return (

    <div className="space-y-6">

      {/* 🔍 SEARCH */}
      <input
        type="text"
        placeholder="Buscar por paciente, tipo o especialidad..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full border rounded-lg px-4 py-3 text-lg"
      />

      {filtered.length === 0 && (
        <p className="text-gray-500">
          No se encontraron resultados.
        </p>
      )}

      <div className="space-y-4">

        {filtered.map((doc: any) => (

          <div
            key={doc.id}
            className="border rounded-lg p-4 flex justify-between items-center hover:shadow-md transition"
          >

            <div>

              <p className="font-semibold">
                {doc.user?.fullName}
              </p>

              <p className="text-sm text-gray-500 flex gap-2 flex-wrap">

                <span>{doc.docType}</span>

                {doc.bodyPart && (
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full capitalize">
                    {doc.bodyPart}
                  </span>
                )}

                {doc.specialty && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full capitalize">
                    {doc.specialty.replace("_", " / ")}
                  </span>
                )}

              </p>

            </div>

            <div className="text-sm text-gray-400">
              {new Date(doc.createdAt).toLocaleDateString()}
            </div>

          </div>

        ))}

      </div>

    </div>

  )
}