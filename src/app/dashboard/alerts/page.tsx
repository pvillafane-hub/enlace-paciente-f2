import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getValidatedSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'

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

  return (

    <div className="max-w-5xl mx-auto space-y-8">

      {/* Header */}

      <div className="bg-white border rounded-xl p-6">

        <h1 className="text-2xl font-bold">
          Alertas médicas
        </h1>

        <p className="text-gray-500 mt-2">
          Actividad reciente de tus pacientes
        </p>

      </div>


      {/* Sin alertas */}

      {alerts.length === 0 && (

        <div className="bg-white border rounded-xl p-6">

          <p className="text-gray-500">
            No tienes alertas todavía.
          </p>

        </div>

      )}


      {/* Lista de alertas */}

      <div className="space-y-4">

        {alerts.map((alert: AlertWithPatient) => (

          <Link
            key={alert.id}
            href={`/dashboard/patients/${alert.patient.id}`}
            className="block bg-white border rounded-xl p-6 hover:bg-gray-50 transition"
          >

            <p className="font-semibold text-lg">
              🔔 {alert.patient.fullName}
            </p>

            <p className="text-gray-600">
              {alert.type}
            </p>

            <p className="text-xs text-gray-400 mt-2">
              {new Date(alert.createdAt).toLocaleString()}
            </p>

          </Link>

        ))}

      </div>

    </div>
  )
}