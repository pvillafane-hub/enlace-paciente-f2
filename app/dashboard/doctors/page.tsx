import { unstable_noStore as noStore } from 'next/cache'
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { getValidatedSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { revokeAccess, inviteDoctor } from "./actions"
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
  // 🧑‍🦱 PACIENTE
  // ===================================================
  if (!isDoctor) {

    const doctors = await prisma.doctorPatient.findMany({
      where: { patientId: userId },
      include: { doctor: true }
    })

    return (
      <div className="max-w-4xl mx-auto space-y-8">

        <h1 className="text-2xl font-bold">
          Gestión de acceso médico
        </h1>

        {/* 🔥 NUEVO: INVITAR DOCTOR */}
        <div className="bg-white border rounded-xl p-6">

          <h2 className="text-lg font-semibold mb-4">
            Añadir doctor
          </h2>

          <form action={inviteDoctor} className="flex flex-col md:flex-row gap-3">

            <input
              type="email"
              name="email"
              placeholder="Email del doctor"
              required
              className="border rounded-lg px-4 py-3 flex-1"
            />

            <button
              className="bg-blue-600 text-white px-5 py-3 rounded-lg hover:bg-blue-700"
            >
              Enviar solicitud
            </button>

          </form>

          <p className="text-xs text-gray-400 mt-3">
            El doctor recibirá una solicitud para acceder a su información médica.
          </p>

          {/* 🔥 LINK QR */}
          <div className="mt-4">
            <Link
              href="/dashboard/qr"
              className="text-blue-600 text-sm underline"
            >
              Mostrar código al doctor
            </Link>
          </div>

        </div>

        {/* DOCTORES CON ACCESO */}
        <div>
          <h2 className="text-xl font-semibold mb-4">
            Doctores con acceso
          </h2>

          {doctors.length === 0 && (
            <p className="text-gray-500">
              No tienes doctores con acceso todavía.
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

  const patientsData = await prisma.doctorPatient.findMany({
    where: { doctorId: userId },
    include: {
      patient: {
        include: {
          documents: {
            orderBy: {
              createdAt: "desc"
            }
          }
        }
      }
    }
  })

  return (
    <div className="max-w-6xl mx-auto space-y-10">

      <h1 className="text-3xl font-bold">
        Dashboard del Doctor
      </h1>

      {patientsData.length === 0 && (
        <p className="text-gray-500">
          No tienes pacientes asignados.
        </p>
      )}

      <div className="space-y-8">

        {patientsData.map((p) => {
          if (!p.patient) return null

          return (
            <div
              key={p.patient.id}
              className="bg-white border rounded-2xl p-6 shadow-sm"
            >

              <h2 className="text-xl font-semibold mb-4">
                {p.patient.fullName}
              </h2>

              {p.patient.documents.length === 0 ? (
                <p className="text-gray-500">
                  Este paciente no tiene documentos.
                </p>
              ) : (
                <div className="space-y-3">

                  {p.patient.documents.map((doc) => {

                    return (
                      <div
                        key={doc.id}
                        className="border rounded-lg p-4"
                      >

                        <p className="font-semibold">
                          {doc.docType}
                        </p>

                        {doc.bodyPart && (
                          <div className="mt-1">
                            <span className="text-xs bg-gray-100 px-2 py-1 rounded-full capitalize">
                              {doc.bodyPart}
                            </span>
                          </div>
                        )}

                        <p className="text-sm text-gray-500">
                          {doc.facility}
                        </p>

                        <p className="text-xs text-gray-400">
                          {doc.studyDate}
                        </p>

                      </div>
                    )
                  })}

                </div>
              )}

            </div>
          )
        })}

      </div>

    </div>
  )
}