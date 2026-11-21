import { prisma } from "@/lib/prisma"
import { getValidatedSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import ActivitySearch from "./ActivitySearch"
import { requireAuditedDoctorAccessForActor, MedicalAccessDeniedError } from "@/lib/multitenant-access"

export const dynamic = "force-dynamic"

export default async function ReportsPage() {

  const session = await getValidatedSession()

  if (!session?.userId) {
    redirect("/?auth=required")
  }

  const doctor = await prisma.user.findUnique({
    where: { id: session.userId }
  })

  if (!doctor?.active || doctor.role !== "DOCTOR") {
    redirect("/dashboard")
  }

  const grants = await prisma.medicalAccessGrant.findMany({
    where: { doctorId: doctor.id, status: 'ACTIVE', revokedAt: null, OR: [{ validUntil: null }, { validUntil: { gt: new Date() } }], organization: { status: 'ACTIVE' }, patient: { active: true } },
    select: { patientId: true },
    distinct: ['patientId'],
  })
  const legacyPatients = (await prisma.user.findMany({
    where: { id: { in: grants.map(g => g.patientId) }, role: 'PATIENT', active: true },
  })).map(patient => ({ id: patient.id, patientId: patient.id, patient }))

  const patients = (await Promise.all(legacyPatients.map(async p => {
    try {
      await requireAuditedDoctorAccessForActor({ actorId: doctor.id, patientId: p.patientId, operation: 'READ_RECORD' })
      return p
    } catch (error) {
      if (error instanceof MedicalAccessDeniedError) return null
      throw error
    }
  }))).filter((p): p is NonNullable<typeof p> => p !== null)

  const patientIds = patients.map(p => p.patientId)

  const documents = await prisma.document.findMany({
    where: {
      userId: {
        in: patientIds
      }, deletedAt: null
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
      }, deletedAt: null
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
      userId: { in: patientIds }, deletedAt: null
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

      {/* HEADER */}
      <div className="bg-white border rounded-xl p-6">
        <h1 className="text-3xl font-bold">
          Reportes clínicos
        </h1>

        <p className="text-gray-500 mt-2">
          Monitoreo clínico de pacientes y actividad reciente
        </p>

        <p className="text-sm text-gray-400 mt-1">
          Identifica pacientes sin actividad y revisa la información clínica más reciente.
        </p>
      </div>

      {/* Estadísticas */}
      <div className="grid md:grid-cols-4 gap-6">

        <StatCard title="Pacientes activos" value={patients.length} />
        <StatCard title="Estudios registrados" value={documents.length} />
        <StatCard title="Accesos pendientes" value={pendingRequests} />
        <StatCard title="Sistema operativo" value="Activo" />

      </div>

      {/* 🔴 INACTIVOS */}
      <div className="bg-white border rounded-xl p-6">

        <h2 className="text-xl font-semibold mb-1">
          Pacientes que requieren seguimiento
        </h2>

        <p className="text-sm text-gray-500 mb-6">
          Pacientes sin actividad clínica reciente
        </p>

        {inactivePatients.length === 0 && (
          <p className="text-gray-500">
            Todos los pacientes presentan actividad reciente.
          </p>
        )}

        <div className="space-y-4">

          {inactivePatients.map(p => {

            const label =
              p.daysInactive >= 365
                ? "Más de 1 año sin actividad"
                : `Sin actividad en los últimos ${p.daysInactive} días`

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
          Actividad reciente
        </h2>

        {documents.length === 0 ? (
          <p className="text-gray-500">
            No hay actividad clínica reciente.
          </p>
        ) : (
          <ActivitySearch documents={documents} />
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