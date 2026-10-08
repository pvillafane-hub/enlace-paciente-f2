'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Html5QrcodeScanner } from 'html5-qrcode'

type Patient = { id: string; name: string; email: string }

function Scanner({ onFound }: { onFound: (patient: Patient) => void }) {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  useEffect(() => {
    let busy = false, disposed = false
    const scanner = new Html5QrcodeScanner('reader', { fps: 10, qrbox: 250 }, false)
    scanner.render(async decoded => {
      if (busy || disposed) return
      busy = true; setLoading(true); setError('')
      try {
        const url = new URL(decoded)
        const match = /^\/qr\/([^/]+)$/.exec(url.pathname)
        if (!match || !['http:', 'https:'].includes(url.protocol)) throw new Error('Formato inválido')
        const token = decodeURIComponent(match[1])
        const response = await fetch('/api/qr/lookup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) })
        if (!response.ok) throw new Error('Código inválido o expirado')
        const data = await response.json()
        if (!data.patient?.id || typeof data.patient.name !== 'string' || typeof data.patient.email !== 'string') throw new Error('Respuesta inválida')
        await scanner.clear()
        if (!disposed) onFound(data.patient)
      } catch {
        if (!disposed) setError('No se pudo leer el código. Verifica que sea un QR vigente de Enlace Salud.')
      } finally { busy = false; if (!disposed) setLoading(false) }
    }, () => {})
    return () => { disposed = true; void scanner.clear().catch(() => {}) }
  }, [onFound])
  return <div><div id="reader" />{loading && <p role="status">Buscando paciente…</p>}{error && <p role="alert" className="text-red-700">{error}</p>}</div>
}

export default function QRScannerClient() {
  const [patient, setPatient] = useState<Patient | null>(null)
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()
  async function requestAccess() {
    if (!patient || sending) return
    setSending(true); setMessage('')
    try {
      const response = await fetch('/api/doctor/request-access', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ patientId: patient.id }) })
      if (!response.ok) throw new Error('Solicitud fallida')
      setMessage('Solicitud procesada. El acceso requiere autorización del paciente.'); router.refresh()
    } catch { setMessage('No se pudo solicitar acceso. Intenta de nuevo.') }
    finally { setSending(false) }
  }
  return <div className="space-y-4">
    {!patient ? <Scanner onFound={setPatient} /> : <div className="border p-4 rounded-lg bg-gray-50">
      <p className="font-semibold">{patient.name}</p><p>{patient.email}</p>
      <div className="flex gap-3 mt-3">
        <button disabled={sending} onClick={requestAccess} className="bg-blue-600 text-white px-4 py-2 rounded-lg disabled:opacity-50">{sending ? 'Enviando…' : 'Solicitar acceso'}</button>
        <button disabled={sending} onClick={() => { setPatient(null); setMessage('') }} className="border px-4 py-2 rounded-lg">Escanear otro paciente</button>
      </div>
    </div>}
    {message && <p role="status">{message}</p>}
  </div>
}
