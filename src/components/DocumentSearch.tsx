'use client'

import { useState } from 'react'

export default function DocumentSearch({ documents }: any) {

  const [query, setQuery] = useState("")

  const filtered = documents.filter((doc: any) => {

    const text =
      (doc.filename || "") +
      " " +
      (doc.docType || "") +
      " " +
      (doc.facility || "") +
      " " +
      (doc.bodyPart || "") +
      " " +
      (doc.specialty || "")

    return text.toLowerCase().includes(query.toLowerCase())

  })

  // 🔥 LABELS PRO
  const specialtyLabels: any = {
    cardiologia: "Cardiología",
    endocrinologia: "Endocrinología",
    nefrologia: "Nefrología",
    hematologia_oncologia: "Hematología / Oncología",
    urologia: "Urología",
    reumatologia: "Reumatología",
    neumologia: "Neumología",
    geriatria: "Geriatría",
    pediatria: "Pediatría",
  }

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

        {filtered.map((doc: any) => {

          const isDemoDoc =
            doc.filePath && doc.filePath.startsWith("/demo")

          const href = isDemoDoc
            ? doc.filePath
            : `/api/documents/view?id=${doc.id}`

          return (

            <div
              key={doc.id}
              className="border rounded-lg p-4 flex justify-between items-center hover:bg-gray-50 transition"
            >

              <div className="flex items-center gap-4">

                {/* PREVIEW SOLO SI ES DEMO */}
                {isDemoDoc && (
                  <img
                    src={doc.filePath}
                    className="w-16 h-16 object-cover rounded-lg border"
                  />
                )}

                <div>

                  <p className="font-semibold">
                    {doc.filename}
                  </p>

                  <p className="text-sm text-gray-500 flex items-center gap-2 flex-wrap">
                    
                    <span>{doc.docType}</span>

                    {/* BODY PART */}
                    {doc.bodyPart && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full capitalize">
                        {doc.bodyPart}
                      </span>
                    )}

                    {/* 🔥 SPECIALTY NUEVO */}
                    {doc.specialty && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                        {specialtyLabels[doc.specialty] || doc.specialty}
                      </span>
                    )}

                    <span>· {doc.facility}</span>

                  </p>

                  <p className="text-xs text-gray-400">
                    {doc.studyDate}
                  </p>

                </div>

              </div>

              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                Ver
              </a>

            </div>

          )

        })}

      </div>

    </div>

  )
}