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

  // 🔥 POLLING (cada 10s)
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

  // 🔥 RESOLVER ALERTA + REFRESH UI
  const handleResolve = async (alertId: string) => {
    try {
      await fetch(`/api/alerts/${alertId}/resolve`, {
        method: "POST"
      })

      // 💥 quitar del estado inmediato
      setAlerts(prev => prev.filter(a => a.id !== alertId))

      // 💥 sincronizar con layout/server
      router.refresh()

    } catch (e) {
      console.error("Error resolving alert", e)
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

          <div className="p-4 border-b font-semibold">
            Notificaciones
          </div>

          <div className="max-h-80 overflow-y-auto">

            {alerts.length === 0 && (
              <p className="p-4 text-gray-500">
                No hay alertas
              </p>
            )}

            {alerts.map(alert => (

              <Link
                key={alert.id}
                href={`/dashboard/patients/${alert.patientId}`}
                className="block p-4 hover:bg-gray-50 border-b"
                onClick={() => {
                  handleResolve(alert.id) // 🔥 resolver
                  setOpen(false)
                }}
              >

                <p className="font-medium">
                  {alert.patientName}
                </p>

                <p className="text-sm text-gray-500">
                  {alert.type}
                </p>

              </Link>

            ))}

          </div>

        </div>

      )}

    </div>
  )
}