import Link from "next/link"
import DashboardView from "./DashboardView"
import { prisma } from "@/lib/prisma"
import { getValidatedSession } from "@/lib/auth"
import { redirect } from "next/navigation"

// 🔐 NUEVO
import { getUserLicense } from "@/lib/license"

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

  const passkey = await prisma.authMethod.findFirst({
    where: { userId: session.userId }
  })

  const passkeyEnabled = Boolean(passkey)

  // 🔥 DEMO
  const isDemo = userData.email === "doctor_demo@enlace.com"

  // 🔐 LICENCIA
  const license = await getUserLicense(session.userId)

  // 🔐 DEV BYPASS
  const isDevBypass =
    process.env.NODE_ENV === "development" ||
    process.env.DEV_BYPASS_LICENSE === "true"

  // 🔥 PAYWALL GLOBAL DOCTOR
  if (
    isDoctor &&
    !isDemo &&
    !isDevBypass &&
    (!license || license.status !== "ACTIVE")
  ) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="bg-white border rounded-2xl p-10 text-center max-w-md shadow-sm">

          <h2 className="text-2xl font-bold mb-4">
            Activa tu licencia
          </h2>

          <p className="text-gray-600 mb-6">
            Para usar Enlace Salud necesitas una licencia activa.
          </p>

          {/* 🔥 CAMBIO AQUÍ */}
          <a
            href="/api/stripe/checkout"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold"
          >
            Activar licencia
          </a>

        </div>
      </div>
    )
  }

  // -----------------------------
  // DASHBOARD DOCTOR
  // -----------------------------

  if (isDoctor) {

    let patientsData

    if (isDemo) {
      patientsData = [
        {
          patient: {
            id: "1",
            fullName: "Juan Pérez",
            email: "juan@email.com",
            createdAt: new Date(),
            documents: [
              {
                createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 65)
              }
            ]
          }
        },
        {
          patient: {
            id: "2",
            fullName: "María del Carmen",
            email: "maria@email.com",
            createdAt: new Date(),
            documents: [
              {
                createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 20)
              }
            ]
          }
        },
        {
          patient: {
            id: "3",
            fullName: "Ana Vélez",
            email: "ana@email.com",
            createdAt: new Date(),
            documents: []
          }
        }
      ]
    } else {
      patientsData = await prisma.doctorPatient.findMany({
        where: {
          doctorId: userData.id
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

    const patients = patientsData.map(p => {

      const docs = p.patient.documents

      let score = 0

      if (!docs || docs.length === 0) {
        score = 0
      } else {

        let latestDoc = docs[0]

        for (let i = 1; i < docs.length; i++) {
          if (new Date(docs[i].createdAt) > new Date(latestDoc.createdAt)) {
            latestDoc = docs[i]
          }
        }

        const diffDays = Math.floor(
          (Date.now() - new Date(latestDoc.createdAt).getTime()) /
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
        score
      }
    })

    const criticalPatients = patients
      .filter(p => p.score >= 70)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)

    return (
      <div className="space-y-10">

        <div>
          <h1 className="text-3xl font-bold">
            Dashboard del Doctor
          </h1>
          <p className="text-gray-500 mt-2">
            Resumen inteligente de tus pacientes
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <StatCard title="Pacientes activos" value={patients.length} />
          <StatCard title="Riesgo alto" value={criticalPatients.length} />
          <StatCard title="Sistema" value="Monitoreando" />
        </div>

      </div>
    )
  }

  // -----------------------------
  // DASHBOARD PACIENTE
  // -----------------------------

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