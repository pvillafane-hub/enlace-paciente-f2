import { prisma } from "@/lib/prisma"
import { getValidatedSession } from "@/lib/auth"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function ReportsPage() {

  const session = await getValidatedSession()

  if (!session) redirect("/?auth=required")

  const doctor = await prisma.user.findUnique({
    where: { id: session.userId }
  })

  if (!doctor || doctor.role !== "DOCTOR") {
    redirect("/dashboard")
  }

  const patients = await prisma.doctorPatient.findMany({
    where: {
      doctorId: doctor.id
    },
    include: {
      patient: true
    }
  })

  const patientIds = patients.map(p => p.patientId)

  const documents = await prisma.document.findMany({
    where: {
      userId: {
        in: patientIds
      }
    },
    include: {
      user: true
    },
    orderBy: {
      createdAt: "desc"
    },
    take: 20
  })

  const documentsByType = await prisma.document.groupBy({
    by: ["docType"],
    where: {
      userId: {
        in: patientIds
      }
    },
    _count: true
  })

  const pendingRequests = await prisma.medicalAccessRequest.count({
    where: {
      doctorId: doctor.id,
      status: "PENDING"
    }
  })

  // 🔥 NUEVO: ACTIVIDAD POR PACIENTE
  const activity = await prisma.document.groupBy({
    by: ["userId"],
    where: {
      userId: { in: patientIds }
    },
    _max: {
      createdAt: true
    }
  })

  const lastActivityMap = new Map(
    activity.map(a => [a.userId, a._max.createdAt])
  )

  const now = Date.now()
  const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000

  const inactivePatients = patients.map(p => {

    const last = lastActivityMap.get(p.patient.id)

    let daysInactive = 999

    if (last) {
      daysInactive = Math.floor(
        (now - new Date(last).getTime()) / (1000 * 60 * 60 * 24)
      )
    }

    return {
      id: p.patient.id,
      name: p.patient.fullName,
      daysInactive
    }

  })
  .filter(p => p.daysInactive >= 30)
  .sort((a, b) => b.daysInactive - a.daysInactive)

  return (

    <div className="max-w-6xl mx-auto space-y-10">

      <div className="bg-white border rounded-xl p-6">

        <h1 className="text-3xl font-bold">
          Reportes clínicos
        </h1>

        <p className="text-gray-500 mt-2">
          Resumen de actividad de tus pacientes
        </p>

      </div>

      {/* Estadísticas */}

      <div className="grid md:grid-cols-4 gap-6">

        <StatCard title="Pacientes" value={patients.length} />
        <StatCard title="Estudios" value={documents.length} />
        <StatCard title="Solicitudes pendientes" value={pendingRequests} />
        <StatCard title="Estado" value="Activo" />

      </div>

      {/* 🔴 NUEVO: INACTIVOS */}

      <div className="bg-white border rounded-xl p-6">

        <h2 className="text-xl font-semibold mb-6 text-red-700">
          Pacientes sin actividad reciente
        </h2>

        {inactivePatients.length === 0 && (
          <p className="text-gray-500">
            Todos los pacientes están activos.
          </p>
        )}

        <div className="space-y-4">

          {inactivePatients.map(p => (

            <div
              key={p.id}
              className="border rounded-lg p-4 flex justify-between items-center"
            >

              <div>
                <p className="font-semibold">{p.name}</p>
                <p className="text-sm text-gray-500">
                  {p.daysInactive} días sin actividad
                </p>
              </div>

              <a
                href={`/dashboard/patients/${p.id}`}
                className="text-sm bg-blue-600 text-white px-3 py-1 rounded"
              >
                Ver paciente
              </a>

            </div>

          ))}

        </div>

      </div>

      {/* Actividad reciente */}

      <div className="bg-white border rounded-xl p-6">

        <h2 className="text-xl font-semibold mb-6">
          Actividad reciente
        </h2>

        {documents.length === 0 && (
          <p className="text-gray-500">
            No hay actividad reciente.
          </p>
        )}

        <div className="space-y-4">

          {documents.map(doc => (

            <div
              key={doc.id}
              className="border rounded-lg p-4 flex justify-between items-center"
            >

              <div>
                <p className="font-semibold">
                  {doc.user.fullName}
                </p>
                <p className="text-sm text-gray-500">
                  {doc.docType}
                </p>
              </div>

              <div className="text-sm text-gray-400">
                {new Date(doc.createdAt).toLocaleDateString()}
              </div>

            </div>

          ))}

        </div>

      </div>

      {/* Estudios por tipo */}

      <div className="bg-white border rounded-xl p-6">

        <h2 className="text-xl font-semibold mb-6">
          Estudios por tipo
        </h2>

        <div className="grid md:grid-cols-3 gap-6">

          {documentsByType.map(item => (

            <div
              key={item.docType}
              className="bg-gray-50 border rounded-lg p-6 text-center"
            >

              <p className="text-gray-500 text-sm">
                {item.docType}
              </p>

              <p className="text-3xl font-bold mt-2">
                {item._count}
              </p>

            </div>

          ))}

        </div>

      </div>

    </div>

  )
}

function StatCard({
  title,
  value
}: {
  title: string
  value: number | string
}) {
  return (
    <div className="bg-white rounded-xl p-6 border shadow-sm">
      <p className="text-gray-500 text-sm">{title}</p>
      <p className="text-3xl font-bold mt-2">{value}</p>
    </div>
  )
}