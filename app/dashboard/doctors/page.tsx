import { unstable_noStore as noStore } from 'next/cache'
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { getValidatedSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { revokeAccess, inviteDoctor } from "./actions"

// 🔐 NUEVO
import { getUserLicense } from "@/lib/license"

export const dynamic = "force-dynamic"

export default async function DoctorsPage() {
  noStore()

  const session = await getValidatedSession()

  if (!session || !session.userId) {
    redirect("/?auth=required")
  }

  const userId = session.userId

  const user = await prisma.user.findUnique({
    where: { id: userId }
  })

  if (!user) {
    redirect("/")
  }

  const license = await getUserLicense(userId)

  const isDoctor = user.role === "DOCTOR"

  // ===================================================
  // 👨‍⚕️ DOCTOR
  // ===================================================

  const isDemo = user.email === "doctor_demo@enlace.com"
  const isDevBypass = process.env.DEV_BYPASS_LICENSE === "true"

  if (!license && !isDemo && !isDevBypass) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="bg-white border rounded-2xl p-10 text-center max-w-md shadow-sm">
          <h2 className="text-2xl font-bold mb-4">
            Activa tu licencia
          </h2>

          <p className="text-gray-600 mb-6">
            Para acceder a tus pacientes necesitas una licencia activa.
          </p>

          <Link
            href="/api/stripe/checkout"
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold"
          >
            Activar licencia
          </Link>
        </div>
      </div>
    )
  }

  const patientsData = await prisma.doctorPatient.findMany({
    where: {
      doctorId: userId
    },
    include: {
      patient: {
        include: {
          documents: true
        }
      }
    }
  })

  const now = Date.now()
  const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000

  let activeCount = 0
  let inactiveCount = 0

  // Procesar actividad
  const processedPatients = patientsData.map(p => {
    const docs = p.patient.documents || []

    const sortedDocs = docs.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() -
        new Date(a.createdAt).getTime()
    )

    const latest = sortedDocs[0]

    const diff = latest
      ? now - new Date(latest.createdAt).getTime()
      : Infinity

    const isInactive = diff > THIRTY_DAYS

    if (!latest) {
      inactiveCount++
    } else if (isInactive) {
      inactiveCount++
    } else {
      activeCount++
    }

    return {
      ...p,
      latest,
      isInactive
    }
  })

  // 🔥 Ordenar por actividad reciente
  processedPatients.sort((a, b) => {
    return new Date(b.latest?.createdAt || 0).getTime() -
           new Date(a.latest?.createdAt || 0).getTime()
  })

  return (
    <div className="max-w-6xl mx-auto space-y-10">

      <div>
        <h1 className="text-3xl font-bold">
          Dashboard del Doctor
        </h1>

        <p className="text-gray-500 mt-2">
          Selecciona un paciente para ver su información
        </p>
      </div>

      {/* STATS */}
      <div className="grid md:grid-cols-3 gap-6">

        <StatCard title="Pacientes totales" value={patientsData.length} />
        <StatCard title="Con actividad reciente" value={activeCount} />
        <StatCard title="Requieren revisión" value={inactiveCount} />

      </div>

      {/* LISTA DE PACIENTES */}
      <div className="bg-white border rounded-xl p-6">

        <h2 className="text-xl font-semibold mb-4">
          Pacientes
        </h2>

        <div className="space-y-3">

          {processedPatients.map((p) => {
            const patient = p.patient

            return (
              <Link
                key={patient.id}
                href={`/dashboard/patients/${patient.id}`}
                className={`block border rounded-lg p-4 transition ${
                  p.isInactive
                    ? "border-yellow-400 bg-yellow-50"
                    : "hover:bg-gray-50"
                }`}
              >
                <div className="flex justify-between items-center">

                  <div>
                    <p className="font-semibold">
                      {patient.fullName}
                    </p>
                    <p className="text-sm text-gray-500">
                      {patient.email}
                    </p>
                  </div>

                  <div className="text-sm text-gray-500 text-right">
                    {p.latest
                      ? (
                        <>
                          <p>Último doc</p>
                          <p className="font-medium">
                            {new Date(p.latest.createdAt).toLocaleDateString()}
                          </p>
                        </>
                      )
                      : "Sin documentos"}
                  </div>

                </div>
              </Link>
            )
          })}

        </div>
      </div>

    </div>
  )
}

function StatCard({ title, value }: any) {
  return (
    <div className="bg-white rounded-xl p-6 border shadow-sm">
      <p className="text-gray-500 text-sm">{title}</p>
      <p className="text-3xl font-bold mt-2">{value}</p>
    </div>
  )
}