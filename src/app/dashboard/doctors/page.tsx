import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { getValidatedSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { revokeAccess } from "./actions"

export const dynamic = "force-dynamic"

export default async function DoctorsPage() {

  const session = await getValidatedSession()

  if (!session) {
    redirect("/?auth=required")
  }

  // 🔥 FIX CRÍTICO
  if (!session.userId) {
    redirect("/?auth=required")
  }

  const userId = session.userId

  const user = await prisma.user.findUnique({
    where: { id: userId }
  })

  if (!user) {
    redirect("/")
  }

  const isDoctor = user.role === "DOCTOR"

  // ===================================================
  // 🧑‍🦱 PACIENTE
  // ===================================================
  if (!isDoctor) {

    const doctors = await prisma.doctorPatient.findMany({
      where: { patientId: userId },
      include: { doctor: true }
    })

    const requests = await prisma.medicalAccessRequest.findMany({
      where: {
        patientId: userId,
        status: "PENDING"
      },
      include: { doctor: true }
    })

    return (
      <div className="max-w-4xl mx-auto space-y-8">

        <h1 className="text-2xl font-bold">
          Gestión de acceso médico
        </h1>

        {/* ➕ AUTORIZAR */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">

          <h2 className="font-semibold mb-3">
            Autorizar un doctor
          </h2>

          <form
            action="/api/patient/invite-doctor"
            method="POST"
            className="flex gap-3"
          >
            <input
              name="email"
              type="email"
              placeholder="Email del doctor"
              required
              className="flex-1 border rounded-lg px-3 py-2"
            />

            <button className="bg-blue-600 text-white px-4 rounded-lg">
              Autorizar
            </button>
          </form>

        </div>

        {/* 📩 SOLICITUDES */}
        <div>

          <div className="flex justify-between items-center mb-4">

            <h2 className="text-xl font-semibold">
              Solicitudes de acceso
            </h2>

            <Link
              href="/dashboard/doctors/requests"
              className="text-sm text-blue-600"
            >
              Ver todas
            </Link>

          </div>

          {requests.length === 0 && (
            <p className="text-gray-500">
              No tienes solicitudes pendientes.
            </p>
          )}

          <div className="space-y-4">

            {requests.map(r => (

              <div
                key={r.id}
                className="bg-yellow-50 border border-yellow-300 rounded-xl p-4 flex justify-between items-center"
              >

                <div>
                  <p className="font-semibold">
                    {r.doctor.fullName}
                  </p>
                  <p className="text-sm text-gray-500">
                    {r.doctor.email}
                  </p>
                </div>

                <Link
                  href="/dashboard/doctors/requests"
                  className="text-sm bg-green-600 text-white px-3 py-1 rounded"
                >
                  Revisar
                </Link>

              </div>

            ))}

          </div>

        </div>

        {/* 👨‍⚕️ DOCTORES */}
        <div>

          <h2 className="text-xl font-semibold mb-4">
            Doctores con acceso
          </h2>

          {doctors.length === 0 && (
            <p className="text-gray-500">
              No tienes doctores autorizados.
            </p>
          )}

          <div className="space-y-4">

            {doctors.map(d => (

              <div
                key={d.doctor.id}
                className="bg-white border rounded-xl p-4 flex justify-between items-center"
              >

                <div>
                  <p className="font-semibold">
                    {d.doctor.fullName}
                  </p>
                  <p className="text-sm text-gray-500">
                    {d.doctor.email}
                  </p>
                </div>

                {/* 🔥 FIX FINAL SERVER ACTION */}
                <form
                  action={async (formData: FormData) => {
                    await revokeAccess(d.doctor.id)
                  }}
                >
                  <button className="text-red-600 text-sm">
                    Revocar acceso
                  </button>
                </form>

              </div>

            ))}

          </div>

        </div>

      </div>
    )
  }

  // ===================================================
  // 👨‍⚕️ DOCTOR
  // ===================================================

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

  patientsData.forEach(p => {

    const docs = p.patient.documents

    if (!docs || docs.length === 0) {
      inactiveCount++
      return
    }

    const latest = docs.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0]

    const diff = now - new Date(latest.createdAt).getTime()

    if (diff <= THIRTY_DAYS) {
      activeCount++
    } else {
      inactiveCount++
    }

  })

  return (
    <div className="max-w-6xl mx-auto space-y-10">

      <div>
        <h1 className="text-3xl font-bold">
          Dashboard del Doctor
        </h1>

        <p className="text-gray-500 mt-2">
          Estado de tus pacientes en Enlace Salud
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">

        <StatCard title="Pacientes en sistema" value={patientsData.length} />
        <StatCard title="Pacientes activos" value={activeCount} />
        <StatCard title="Requieren seguimiento" value={inactiveCount} />

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