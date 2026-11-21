'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function DocumentSearch({ documents, allowCategoryEdit = false }: { documents: any[], allowCategoryEdit?: boolean }) {
  const router = useRouter()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [category, setCategory] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const categories = ['Laboratorio', 'Radiografía', 'Resonancia magnética', 'Tomografía', 'Ultrasonido', 'Mamografía', 'Electrocardiograma', 'Receta', 'Medicamentos', 'Informe médico', 'Patología', 'Vacunas', 'Otros']
  async function saveCategory(documentId: string) {
    setSaving(true)
    setMessage('')
    try {
      const response = await fetch('/api/multitenant/doctor/document-category', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ documentId, category }) })
      if (!response.ok) { setMessage(response.status === 404 ? 'No tiene permiso para cambiar esta categoría.' : 'No se pudo guardar. Actualice la página e intente de nuevo.'); return }
      setEditingId(null)
      setMessage('Categoría actualizada correctamente.')
      router.refresh()
    } catch { setMessage('Error de conexión al guardar.') } finally { setSaving(false) }
  }


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

      {message && <p role="status" className="rounded-lg bg-blue-50 p-3 text-sm text-blue-900">{message}</p>}

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

              <div className="flex flex-col gap-2 items-end">
              {allowCategoryEdit && !isDemoDoc && (
                editingId === doc.id ? <div className="flex flex-col gap-2">
                  <label htmlFor={'category-' + doc.id} className="text-sm font-semibold">Categoría del estudio</label>
                  <select id={'category-' + doc.id} value={category} onChange={e => setCategory(e.target.value)} className="rounded border p-2">
                    {[doc.docType, ...categories.filter(value => value !== doc.docType)].map(value => <option key={value} value={value}>{value}</option>)}
                  </select>
                  <button type="button" disabled={saving} onClick={() => saveCategory(doc.id)} className="rounded bg-green-700 px-3 py-2 text-white disabled:opacity-50">Guardar</button>
                  <button type="button" disabled={saving} onClick={() => setEditingId(null)} className="rounded border px-3 py-2">Cancelar</button>
                </div> : <button type="button" onClick={() => { setEditingId(doc.id); setCategory(doc.docType); setMessage('') }} className="rounded border border-blue-600 px-3 py-2 text-blue-700">Editar categoría</button>
              )}
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                Ver
              </a>
              </div>

            </div>

          )

        })}

      </div>

    </div>

  )
}