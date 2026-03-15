'use client'

import { useState } from 'react'

export default function DocumentSearch({ documents }: any) {

  const [query, setQuery] = useState("")

  const filtered = documents.filter((doc: any) => {

    const text =
      doc.filename +
      " " +
      doc.docType +
      " " +
      doc.facility

    return text.toLowerCase().includes(query.toLowerCase())

  })

  return (

    <div className="space-y-6">

      {/* BUSCADOR */}

      <input
        type="text"
        placeholder="Buscar estudios médicos..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full border rounded-lg px-4 py-3 text-lg"
      />

      {/* RESULTADOS */}

      {filtered.length === 0 && (

        <p className="text-gray-500">
          No se encontraron resultados.
        </p>

      )}

      <div className="space-y-4">

        {filtered.map((doc: any) => (

          <div
            key={doc.id}
            className="border rounded-lg p-4 flex justify-between items-center"
          >

            <div>

              <p className="font-semibold">
                {doc.filename}
              </p>

              <p className="text-sm text-gray-500">
                {doc.docType} · {doc.facility}
              </p>

              <p className="text-xs text-gray-400">
                {doc.studyDate}
              </p>

            </div>

            <a
              href={`/api/documents/view?id=${doc.id}`}
              target="_blank"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Ver
            </a>

          </div>

        ))}

      </div>

    </div>

  )
}