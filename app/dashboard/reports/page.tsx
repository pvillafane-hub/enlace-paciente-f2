import { prisma } from "@/lib/prisma"
import { getValidatedSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import ActivitySearch from "./ActivitySearch"
import { reportActivity, inactivityLabel } from "@/lib/report-view"

export const dynamic = "force-dynamic"

export default async function ReportsPage() {

  const session = await getValidatedSession()

  if (!session?.userId) {
    redirect("/?auth=required")
  }

  const doctor = await prisma.user.findUnique({
    where: { id: session.userId }
  })

  if (!doctor || doctor.role !== "DOCTOR") {
    redirect("/dashboard")
  }

  const patients = await prisma.doctorPatient.findMany({
    where: {
      doctorId: doctor.id,
      patient: { active: true, role: "PATIENT" }
    },
    select: {
      patientId: true,
      patient: { select: { id: true, fullName: true } }
    }
  })

  const patientIds = patients.map(p => p.patientId)

  const documents = await prisma.document.findMany({
    where: {
      deletedAt: null,
      userId: {
        in: patientIds
      }
    },
    select: {
      id: true, docType: true, specialty: true, bodyPart: true, createdAt: true,
      user: { select: { fullName: true } }
    },
    orderBy: {
      createdAt: "desc"
    },
    take: 20
  })

  const totalDocuments = await prisma.document.count({ where: { deletedAt: null, userId: { in: patientIds } } })

  const documentsByType = await prisma.document.groupBy({
    by: ["docType"],
    where: {
      deletedAt: null,
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

  // 🔥 ACTIVIDAD POR PACIENTE
  const activity = await prisma.document.groupBy({
    by: ["userId"],
    where: {
      deletedAt: null,
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

  const inactivePatients = patients.map(p => {

    const last = lastActivityMap.get(p.patient.id)

    let daysInactive: number | null = null

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
  .filter(p => p.daysInactive === null || p.daysInactive >= 30)
  .sort((a, b) => (b.daysInactive ?? Infinity) - (a.daysInactive ?? Infinity))

  return (

    <div className="max-w-6xl mx-auto space-y-10">

      {/* HEADER */}
      <div className="bg-white border rounded-xl p-6">
        <h1 className="text-3xl font-bold">
          Reportes clínicos
        </h1>

        <p className="text-gray-500 mt-2">
          Seguimiento documental de pacientes y actividad reciente
        </p>

        <p className="text-sm text-gray-400 mt-1">
          Identifica pacientes sin actividad y revisa la información clínica más reciente.
        </p>
      </div>

      {/* Estadísticas */}
      <div className="grid md:grid-cols-4 gap-6">

        <StatCard title="Pacientes activos" value={patients.length} />
        <StatCard title="Estudios registrados" value={totalDocuments} />
        <StatCard title="Accesos pendientes" value={pendingRequests} />
        <StatCard title="Sin documentos registrados" value={inactivePatients.filter(p => p.daysInactive === null).length} />

      </div>

      {/* 🔴 INACTIVOS */}
      <div className="bg-white border rounded-xl p-6">

        <h2 className="text-xl font-semibold mb-1">
          Pacientes que requieren seguimiento
        </h2>

        <p className="text-sm text-gray-500 mb-6">
          Pacientes sin cargas de documentos recientes
        </p>

        {inactivePatients.length === 0 && (
          <p className="text-gray-500">
            Todos los pacientes presentan actividad reciente.
          </p>
        )}

        <div className="space-y-4">

          {inactivePatients.map(p => {

            const label = inactivityLabel(p.daysInactive)

            return (

              <div
                key={p.id}
                className="border rounded-lg p-4 flex justify-between items-center hover:shadow-md transition"
              >

                <div>
                  <p className="font-semibold">{p.name}</p>
                  <p className="text-sm text-gray-500">
                    {label}
                  </p>
                </div>

                <a
                  href={`/dashboard/patients/${p.id}`}
                  className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                >
                  Abrir expediente
                </a>

              </div>

            )
          })}

        </div>

      </div>

      {/* 🔍 Actividad reciente CON SEARCH */}
      <div className="bg-white border rounded-xl p-6">

        <h2 className="text-xl font-semibold mb-6">
          Últimos 20 documentos cargados
        </h2>

        {documents.length === 0 ? (
          <p className="text-gray-500">
            No hay documentos registrados.
          </p>
        ) : (
          <ActivitySearch documents={documents.map(reportActivity)} />
        )}

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