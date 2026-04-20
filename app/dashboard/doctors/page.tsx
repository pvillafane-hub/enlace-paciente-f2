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

  // 🔐 LICENCIA
  const license = await getUserLicense(userId)

  const isDoctor = user.role === "DOCTOR"

  console.log("ROLE:", user.role)
  console.log("IS DOCTOR:", isDoctor)
  console.log("LICENSE:", license)

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

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">

          <h2 className="font-semibold mb-3">
            Autorizar un doctor
          </h2>

          <form
            action={inviteDoctor}
            className="flex flex-col md:flex-row gap-3"
          >
            <input
              name="email"
              type="email"
              placeholder="Email del doctor"
              required
              className="flex-1 border rounded-lg px-3 py-3"
            />

            <button className="bg-blue-600 text-white px-4 py-3 rounded-lg w-full md:w-auto">
              Autorizar
            </button>
          </form>

        </div>

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

            {requests.map(r => {
              if (!r.doctor) return null

              return (
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
              )
            })}

          </div>

        </div>

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

            {doctors.map(d => {
              if (!d.doctor) return null

              return (
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

                  <form action={revokeAccess}>
                    <input type="hidden" name="doctorId" value={d.doctor.id} />
                    <button className="text-red-600 text-sm">
                      Revocar acceso
                    </button>
                  </form>

                </div>
              )
            })}

          </div>

        </div>

      </div>
    )
  }

  // ===================================================
  // 👨‍⚕️ DOCTOR
  // ===================================================

  // 🔐 BYPASS
  const isDemo = user.email === "doctor_demo@enlace.com"
  const isDevBypass = process.env.DEV_BYPASS_LICENSE === "true"

  // 🔐 PAYWALL SOLO DOCTOR
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

          <a
            href="/api/stripe/checkout"
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold inline-block"
          >
            Activar licencia
          </a>

        </div>
      </div>
    )
  }

  // ================= DOCTOR NORMAL =================

  const patientsData = await prisma.doctorPatient.findMany({
    where: { doctorId: userId },
    include: {
      patient: {
        include: { documents: true }
      }
    }
  })

  return (
    <div className="max-w-6xl mx-auto space-y-10">

      <h1 className="text-3xl font-bold">
        Dashboard del Doctor
      </h1>

    </div>
  )
}