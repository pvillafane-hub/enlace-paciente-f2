import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getValidatedSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { resolveAlert } from './actions'

type AlertWithPatient = Prisma.MedicalAlertGetPayload<{
  include: { patient: true }
}>

export default async function AlertsPage() {

  const session = await getValidatedSession()

  if (!session) {
    redirect('/?auth=required')
  }

  const doctorId = session.userId

  const alerts: AlertWithPatient[] = await prisma.medicalAlert.findMany({
    where: {
      doctorId
    },
    include: {
      patient: true
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: 50
  })

  const activeAlerts = alerts.filter(a => !a.resolved)
  const resolvedAlerts = alerts.filter(a => a.resolved)

  return (

    <div className="max-w-5xl mx-auto space-y-10">

      <div className="bg-white border rounded-xl p-6">
        <h1 className="text-2xl font-bold">
          🚨 Alertas médicas
        </h1>
      </div>

      {/* 🔴 ACTIVAS */}

      <div className="space-y-4">

        <h2 className="text-xl font-semibold">
          Alertas activas
        </h2>

        {activeAlerts.length === 0 && (
          <p className="text-gray-500">
            No hay alertas activas
          </p>
        )}

        {activeAlerts.map(alert => (

          <div
            key={alert.id}
            className="bg-red-50 border border-red-300 rounded-xl p-6"
          >

            <div className="flex justify-between items-center">

              <Link
                href={`/dashboard/patients/${alert.patient.id}`}
                className="font-semibold text-lg"
              >
                🔴 {alert.patient.fullName}
              </Link>

              {/* 🔥 BOTÓN */}
              <form action={resolveAlert.bind(null, alert.id)}>
                <button className="text-sm bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700">
                  Resolver
                </button>
              </form>

            </div>

            <p className="text-red-700 mt-2">
              {alert.type}
            </p>

            <p className="text-xs text-gray-500 mt-2">
              {new Date(alert.createdAt).toLocaleString()}
            </p>

          </div>

        ))}

      </div>

      {/* ✅ RESUELTAS */}

      <div className="space-y-4">

        <h2 className="text-xl font-semibold">
          Historial
        </h2>

        {resolvedAlerts.length === 0 && (
          <p className="text-gray-500">
            No hay alertas resueltas
          </p>
        )}

        {resolvedAlerts.map(alert => (

          <div
            key={alert.id}
            className="bg-gray-50 border rounded-xl p-6 opacity-70"
          >

            <p className="font-semibold">
              {alert.patient.fullName}
            </p>

            <p className="text-gray-600">
              {alert.type}
            </p>

            <p className="text-xs text-gray-400 mt-2">
              Resuelta: {alert.resolvedAt
                ? new Date(alert.resolvedAt).toLocaleString()
                : ""}
            </p>

          </div>

        ))}

      </div>

    </div>
  )
}