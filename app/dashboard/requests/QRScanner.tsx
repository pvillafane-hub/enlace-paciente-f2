'use client'

import { useEffect, useRef, useState } from "react"
import { Html5QrcodeScanner } from "html5-qrcode"

export default function QRScanner({ onPatientFound }: any) {

  const scannerRef = useRef<any>(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

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

          const token = decodedText.split("/qr/")[1]

          const res = await fetch(`/api/qr/lookup?token=${token}`)

          if (!res.ok) {
            throw new Error("QR inválido")
          }

          const data = await res.json()

          onPatientFound(data)

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

  return (

    <div className="space-y-4">

      <div id="reader" className="w-full" />

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

    </div>
  )
}