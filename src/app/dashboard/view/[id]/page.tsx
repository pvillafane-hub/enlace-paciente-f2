'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

type Document = {
  id: string
  filename: string
  filePath: string
  docType: string
  facility: string
  studyDate: string
}

export default function ViewPage() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const searchParams = useSearchParams()

  useEffect(() => {
    async function loadDocuments() {
      try {
        const res = await fetch('/api/documents/list')
        if (res.ok) {
          const data = await res.json()
          setDocuments(data)
        }
      } finally {
        setLoading(false)
      }
    }

    loadDocuments()
  }, [])

  async function handleDelete(documentId: string) {
    const confirmed = window.confirm(
      '¿Seguro que deseas eliminar este documento?'
    )
    if (!confirmed) return

    try {
      setDeletingId(documentId)

      const res = await fetch('/api/documents/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId }),
      })

      if (!res.ok) throw new Error()

      setDocuments(prev => prev.filter(d => d.id !== documentId))

      setMessage('Documento eliminado correctamente.')
      setTimeout(() => setMessage(null), 3000)

    } catch {
      alert('Error eliminando documento')
    } finally {
      setDeletingId(null)
    }
  }

  async function handleView(documentId: string) {
    try {
      const res = await fetch(`/api/documents/view?id=${documentId}`)
      if (!res.ok) {
        alert('Error cargando documento')
        return
      }

      const data = await res.json()

      if (!data.url) {
        alert('No se pudo generar el acceso al documento')
        return
      }

      // iPhone-safe
      window.location.href = data.url

    } catch {
      alert('Error abriendo documento')
    }
  }

  const deleted = searchParams?.get('deleted')

  return (
    <div className="max-w-5xl mx-auto">
      <div className="bg-white/90 backdrop-blur rounded-2xl p-8 shadow-sm">

        <h2 className="text-3xl font-bold mb-8">
          Mis documentos médicos
        </h2>

        {message && (
          <div className="bg-green-50 border border-green-300 text-green-800 p-4 rounded-xl mb-6 text-lg font-semibold">
            ✅ {message}
          </div>
        )}

        {deleted && (
          <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded-xl mb-6 text-lg">
            Documento eliminado correctamente.
          </div>
        )}

        {loading && (
          <p className="text-lg text-gray-500">Cargando documentos...</p>
        )}

        {!loading && documents.length === 0 && (
          <p className="text-xl text-gray-500">
            No has subido documentos todavía.
          </p>
        )}

        <div className="space-y-6">
          {documents.map(doc => (
            <div
              key={doc.id}
              className="border rounded-2xl p-6 flex flex-col md:flex-row md:items-center md:justify-between"
            >
              <div className="space-y-2">
                <p className="text-xl font-semibold">
                  {doc.filename}
                </p>

                <p className="text-gray-700 text-lg">
                  <strong>{doc.docType}</strong> · {doc.facility}
                </p>

                <p className="text-base text-gray-500">
                  Fecha del estudio:{' '}
                  {doc.studyDate.split('-').reverse().join('/')}
                </p>
              </div>

              <div className="mt-6 md:mt-0 flex flex-wrap gap-4">

                <button
                  onClick={() => handleView(doc.id)}
                  className="bg-blue-600 text-white px-5 py-3 rounded-xl font-semibold hover:bg-blue-700 transition"
                >
                  Ver documento
                </button>

                <Link
                  href="/dashboard/share"
                  className="bg-green-600 text-white px-5 py-3 rounded-xl font-semibold hover:bg-green-700 transition"
                >
                  Compartir
                </Link>

                <button
                  onClick={() => handleDelete(doc.id)}
                  disabled={deletingId === doc.id}
                  className={`px-5 py-3 rounded-xl font-semibold transition ${
                    deletingId === doc.id
                      ? 'bg-red-300 text-white'
                      : 'bg-red-100 text-red-700 hover:bg-red-200'
                  }`}
                >
                  {deletingId === doc.id
                    ? 'Eliminando...'
                    : 'Eliminar'}
                </button>

              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}