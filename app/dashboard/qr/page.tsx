'use client'

import { useEffect, useState } from 'react'
import { QRCodeCanvas } from 'qrcode.react'

export default function QRPage() {

  const [qrUrl, setQrUrl] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/qr/generate")
      .then(res => res.json())
      .then(data => {
        setQrUrl(data.url)
        setLoading(false)
      })
  }, [])

  return (

    <div className="max-w-md mx-auto text-center space-y-6">

      <h1 className="text-2xl font-bold">
        Mostrar código al doctor
      </h1>

      <p className="text-gray-500">
        Pídale a su doctor que escanee este código.
      </p>

      {loading && (
        <p className="text-gray-400">Generando código...</p>
      )}

      {qrUrl && (
        <div className="flex justify-center">
          <QRCodeCanvas value={qrUrl} size={220} />
        </div>
      )}

      <p className="text-sm text-gray-400">
        Este código expira en unos minutos por seguridad.
      </p>

    </div>

  )
}