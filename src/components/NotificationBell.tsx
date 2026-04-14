"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

interface Alert {
  id: string
  type: string
  patientName: string
  patientId: string
}

export default function NotificationBell({
  alerts: initialAlerts
}: {
  alerts: Alert[]
}) {

  const [alerts, setAlerts] = useState(initialAlerts)
  const [open, setOpen] = useState(false)
  const router = useRouter()

  // 🔥 POLLING
  useEffect(() => {

    const fetchAlerts = async () => {
      try {
        const res = await fetch("/api/alerts")
        if (!res.ok) return

        const data = await res.json()
        setAlerts(data)
      } catch (e) {
        console.error("Error fetching alerts", e)
      }
    }

    const interval = setInterval(fetchAlerts, 10000)

    return () => clearInterval(interval)

  }, [])

  // 🔥 RESOLVER ALERTA
  const handleResolve = async (alertId: string) => {
    try {
      await fetch(`/api/alerts/${alertId}/resolve`, {
        method: "POST"
      })

      setAlerts(prev => prev.filter(a => a.id !== alertId))
      router.refresh()

    } catch (e) {
      console.error("Error resolving alert", e)
    }
  }

  // 🔥 TRADUCIR ALERTA A TEXTO CLÍNICO
  const getAlertMessage = (type: string) => {

    switch (type) {
      case "HIGH_RISK_PATIENT":
        return "Paciente de alta necesidad"

      case "NO_ACTIVITY":
        return "Paciente sin actividad reciente"

      default:
        return "Requiere revisión"
    }
  }

  return (

    <div className="relative">

      {/* 🔔 ICONO */}
      <button
        onClick={() => setOpen(!open)}
        className="relative text-xl"
      >
        🔔

        {alerts.length > 0 && (
          <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs px-2 py-0.5 rounded-full">
            {alerts.length}
          </span>
        )}
      </button>

      {/* DROPDOWN */}
      {open && (

        <div className="absolute right-0 mt-3 w-80 bg-white border rounded-xl shadow-lg z-50">

          {/* HEADER */}
          <div className="p-4 border-b font-semibold">
            Alertas clínicas
          </div>

          <div className="max-h-80 overflow-y-auto">

            {alerts.length === 0 && (
              <p className="p-4 text-gray-500">
                No hay alertas activas
              </p>
            )}

            {alerts.map(alert => (

              <Link
                key={alert.id}
                href={`/dashboard/patients/${alert.patientId}`}
                className="block p-4 hover:bg-gray-50 border-b"
                onClick={() => {
                  handleResolve(alert.id)
                  setOpen(false)
                }}
              >

                {/* NOMBRE */}
                <p className="font-semibold">
                  {alert.patientName}
                </p>

                {/* MENSAJE CLÍNICO */}
                <p className="text-sm text-gray-600 mt-1">
                  {getAlertMessage(alert.type)}
                </p>

                {/* ACCIÓN */}
                <p className="text-xs text-blue-600 mt-2">
                  Ver expediente →
                </p>

              </Link>

            ))}

          </div>

        </div>

      )}

    </div>
  )
}