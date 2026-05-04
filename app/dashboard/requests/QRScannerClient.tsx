'use client'

import { useEffect, useRef, useState } from "react"
import { Html5QrcodeScanner } from "html5-qrcode"

export default function QRScannerClient() {

  const scannerRef = useRef<any>(null)
  const [scannedPatient, setScannedPatient] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {

    const scanner = new Html5QrcodeScanner(
      "reader",
      { fps: 10, qrbox: 250 },
      false
    )

    scanner.render(
      async (decodedText: string) => {
        try {

          setLoading(true)
          setError("")

          const token = decodedText.split("/qr/")[1]

          const res = await fetch(`/api/qr/lookup?token=${token}`)

          if (!res.ok) {
            throw new Error("QR inválido")
          }

          const data = await res.json()

          setScannedPatient(data)

          scanner.clear()

        } catch (e) {
          setError("No se pudo leer el código")
        } finally {
          setLoading(false)
        }
      },
      () => {}
    )

    scannerRef.current = scanner

    return () => {
      scanner.clear().catch(() => {})
    }

  }, [])

  async function requestAccess() {
    if (!scannedPatient) return

    const res = await fetch("/api/doctor/request-access", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        patientId: scannedPatient.id
      })
    })

    if (res.ok) {
      alert("Solicitud enviada")
      setScannedPatient(null)
    } else {
      alert("Error al solicitar acceso")
    }
  }

  return (

    <div className="space-y-4">

      {!scannedPatient && (
        <div id="reader" className="w-full" />
      )}

      {loading && (
        <p className="text-gray-500 text-sm">
          Buscando paciente...
        </p>
      )}

      {error && (
        <p className="text-red-600 text-sm">
          {error}
        </p>
      )}

      {scannedPatient && (
        <div className="border p-4 rounded-lg bg-gray-50">

          <p className="font-semibold">
            {scannedPatient.fullName}
          </p>

          <p className="text-sm text-gray-500">
            {scannedPatient.email}
          </p>

          <button
            onClick={requestAccess}
            className="mt-3 bg-blue-600 text-white px-4 py-2 rounded-lg"
          >
            Solicitar acceso
          </button>

        </div>
      )}

    </div>
  )
}