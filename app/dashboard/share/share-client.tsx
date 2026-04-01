'use client'

import { useState } from 'react'

type Document = {
  id: string
  filename: string
  docType: string
  facility: string
  studyDate: string
}

export default function ShareClient({
  documents,
}: {
  documents: Document[]
}) {
  const [link, setLink] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  async function handleSubmit(formData: FormData) {
    try {
      setLoading(true)

      const res = await fetch('/api/share/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: formData.get('documentId'),
          days: Number(formData.get('days')),
        }),
      })

      const result = await res.json()

      if (result.token) {
        setLink(`${window.location.origin}/s/${result.token}`)
        setCopied(false) // reset estado
      } else if (result.error) {
        alert(result.error)
      }
    } catch (err) {
      console.error(err)
      alert('Error generando enlace')
    } finally {
      setLoading(false)
    }
  }

  async function handleCopy() {
    if (!link) return

    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)

      // desaparecer mensaje luego de 2 segundos
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      alert('No se pudo copiar automáticamente. Copie manualmente.')
    }
  }

  return (
    <div>
      <form
        onSubmit={async e => {
          e.preventDefault()
          const formData = new FormData(e.currentTarget)
          await handleSubmit(formData)
        }}
        className="space-y-8"
      >
        <label className="block text-lg font-semibold">
          Documento a compartir
          <select
            name="documentId"
            required
            className="mt-2 w-full p-4 text-lg border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Selecciona un documento</option>
            {documents.map(doc => (
              <option key={doc.id} value={doc.id}>
                {doc.filename} · {doc.docType} ·{' '}
                {new Date(doc.studyDate).toLocaleDateString('es-PR')}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-lg font-semibold">
          Expiración del enlace
          <select
            name="days"
            defaultValue="7"
            className="mt-2 w-full p-4 text-lg border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="1">24 horas</option>
            <option value="7">7 días</option>
            <option value="30">30 días</option>
          </select>
        </label>

        <button
          type="submit"
          disabled={loading}
          className="bg-green-600 text-white p-4 rounded-xl text-2xl font-semibold w-full hover:bg-green-700 transition"
        >
          {loading ? 'Generando...' : 'Generar enlace'}
        </button>
      </form>

      {link && (
        <div className="mt-8 bg-green-50 border border-green-200 p-4 rounded-xl">
          <p className="font-semibold text-lg mb-2">
            Enlace generado:
          </p>

          <div className="flex gap-2">
            <input
              value={link}
              readOnly
              className="w-full p-3 border rounded-lg text-lg"
            />

            <button
              onClick={handleCopy}
              className="bg-blue-600 text-white px-4 rounded-lg text-lg hover:bg-blue-700 transition"
            >
              Copiar
            </button>
          </div>

          {copied && (
            <div className="mt-3 bg-blue-50 border border-blue-300 text-blue-800 p-3 rounded-xl font-semibold">
              ✅ Enlace copiado correctamente.
            </div>
          )}

          <p className="text-gray-600 mt-2">
            Comparte este enlace con tu médico o familiar.
          </p>
        </div>
      )}
    </div>
  )
}