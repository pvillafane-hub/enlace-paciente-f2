import Link from "next/link"
import DashboardView from "./DashboardView"
import { prisma } from "@/lib/prisma"
import { getValidatedSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getUserLicense } from "@/lib/license"
import ActivatePatientBox from "@/components/staff/ActivatePatientBox"

export const dynamic = "force-dynamic"

export default async function Dashboard() {

  const session = await getValidatedSession()

  if (!session?.userId) {
    redirect("/?auth=required")
  }

  const userData = await prisma.user.findUnique({
    where: { id: session.userId },
    include: {
      documents: true
    }
  })

  if (!userData) {
    redirect("/")
  }

  if (userData.role === "ADMIN") {
    redirect("/dashboard/admin/users")
  }

  const role = userData.role
  const isDoctor = role === "DOCTOR"
  const isStaff = role === "STAFF"
  const isClinicUser = isDoctor || isStaff

  const passkey = await prisma.authMethod.findFirst({
    where: { userId: session.userId }
  })

  const passkeyEnabled = Boolean(passkey)

  const isDemo = userData.email === "doctor_demo@enlace.com"

  let license = null
  if (isDoctor) {
    license = await getUserLicense(session.userId)
  }

  const isDevBypass =
    process.env.DEV_BYPASS_LICENSE === "true"

  const licenseInactive =
    isDoctor &&
    !isDemo &&
    !isDevBypass &&
    (!license || license.status !== "ACTIVE")

  // =========================
  // DASHBOARD DOCTOR / STAFF
  // =========================

  if (isClinicUser) {

    let clinicDoctorId = userData.id

    if (isStaff) {
      const staffRelation = await prisma.clinicStaff.findFirst({
        where: {
          staffId: userData.id,
          active: true
        }
      })

      if (!staffRelation) {
        redirect("/")
      }

      clinicDoctorId = staffRelation.doctorId
    }

    let patientsData

    if (isDemo) {
      patientsData = [
        {
          patient: {
            id: "1",
            fullName: "Juan Pérez",
            email: "juan@email.com",
            documents: [
              { createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 65) }
            ]
          }
        },
        {
          patient: {
            id: "2",
            fullName: "María del Carmen",
            email: "maria@email.com",
            documents: [
              { createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 20) }
            ]
          }
        },
        {
          patient: {
            id: "3",
            fullName: "Ana Vélez",
            email: "ana@email.com",
            documents: []
          }
        }
      ]
    } else {
      patientsData = await prisma.doctorPatient.findMany({
        where: {
          doctorId: clinicDoctorId
        },
        include: {
          patient: {
            include: {
              documents: {
                orderBy: { createdAt: "desc" },
                take: 5
              }
            }
          }
        }
      })
    }

    const now = Date.now()

    const patients = patientsData.map(p => {

      const docs = p.patient.documents

      let score = 0
      let latest = null
      let diffDays = null

      if (!docs || docs.length === 0) {
        score = 0
      } else {

        latest = docs[0]

        diffDays = Math.floor(
          (now - new Date(latest.createdAt).getTime()) /
          (1000 * 60 * 60 * 24)
        )

        if (diffDays >= 60) score = 100
        else if (diffDays >= 30) score = 70
        else score = 10
      }

      return {
        id: p.patient.id,
        name: p.patient.fullName,
        email: p.patient.email,
        score,
        latest,
        diffDays
      }
    })

    patients.sort((a, b) => {
      return new Date(b.latest?.createdAt || 0).getTime() -
             new Date(a.latest?.createdAt || 0).getTime()
    })

    const criticalPatients = patients.filter(p => p.score >= 70)

    return (
      <div className="space-y-10">

        {licenseInactive && (
          <div className="bg-yellow-100 border border-yellow-300 text-yellow-800 p-4 rounded-lg flex justify-between items-center">
            <span>
              ⚠️ Tu licencia está inactiva. Actívala para acceder a tus pacientes.
            </span>
            <a
              href="/api/stripe/checkout"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold"
            >
              Activar licencia
            </a>
          </div>
        )}

        <div>
          <h1 className="text-3xl font-bold">
            {isStaff ? "Dashboard del Staff" : "Dashboard del Doctor"}
          </h1>

          <p className="text-gray-500 mt-2">
            Selecciona un paciente para ver su información
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <StatCard title="Pacientes totales" value={patients.length} />
          <StatCard title="Con actividad reciente" value={patients.length - criticalPatients.length} />
          <StatCard title="Pacientes de alta necesidad" value={criticalPatients.length} />
        </div>

        <ActivatePatientBox />

        <div className="bg-white border rounded-xl p-6">

          <h2 className="text-xl font-semibold mb-1">
            Pacientes
          </h2>

          <p className="text-sm text-gray-500 mb-4">
            Ordenado por actividad reciente
          </p>

          <div className="space-y-4">

            {patients.map((p) => {

              const isCritical = p.score >= 70

              return (
                <Link
                  key={p.id}
                  href={`/dashboard/patients/${p.id}`}
                  className={`block border rounded-lg p-4 transition ${
                    !p.latest
                      ? "bg-gray-100 border-gray-300"
                      : isCritical
                      ? "border-l-4 border-yellow-600 bg-yellow-200"
                      : "hover:bg-gray-50"
                  }`}
                >
                  <div className="flex justify-between items-center">

                    <div>
                      <p className="font-semibold">
                        {p.name || "Paciente"}
                      </p>

                      <p className="text-sm text-gray-500">
                        {p.email}
                      </p>

                      {isCritical && (
                        <p className="text-yellow-900 text-xs font-medium mt-1">
                          Requiere revisión
                        </p>
                      )}

                      {!p.latest && (
                        <p className="text-gray-500 text-xs mt-1">
                          Sin información clínica aún
                        </p>
                      )}
                    </div>

                    <div className="text-sm text-right space-y-1">

                      {isCritical && (
                        <span className="text-xs font-semibold text-yellow-900 bg-yellow-300 px-2 py-1 rounded">
                          Alta necesidad
                        </span>
                      )}

                      {p.latest ? (
                        <>
                          <p className="text-gray-500">
                            Última actividad
                          </p>
                          <p className="font-medium">
                            {new Date(p.latest.createdAt).toLocaleDateString()}
                          </p>

                          {p.diffDays !== null && (
                            <p className="text-xs text-gray-500">
                              hace {p.diffDays} días
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="text-gray-400">
                          Sin documentos
                        </p>
                      )}

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

  // =========================
  // DASHBOARD PACIENTE
  // =========================

  const needsProfile =
    !userData.dateOfBirth ||
    !userData.bloodType ||
    !userData.allergies

  const user = {
    ...userData,
    documents: userData.documents.map(doc => ({
      ...doc,
      studyDate: new Date(doc.studyDate)
    }))
  }

  return (
    <div className="space-y-10">

      {needsProfile && (
        <div className="max-w-5xl mx-auto">
          <div className="bg-yellow-50 border border-yellow-300 p-5 rounded-xl">

            <p className="text-yellow-800 font-semibold text-lg">
              Complete su información médica (toma menos de 1 minuto)
            </p>

            <Link
              href="/dashboard/profile"
              className="inline-block mt-3 bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg"
            >
              Completar ahora
            </Link>

          </div>
        </div>
      )}

      <DashboardView user={user} passkeyEnabled={passkeyEnabled} />

    </div>
  )
}

function StatCard({ title, value }: any) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border">
      <p className="text-gray-500 text-sm">{title}</p>
      <p className="text-3xl font-bold mt-2">{value}</p>
    </div>
  )
}