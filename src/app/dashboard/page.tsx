import Link from "next/link"
import DashboardView from "./DashboardView"
import { prisma } from "@/lib/prisma"
import { getValidatedSession } from "@/lib/auth"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function Dashboard() {

  const session = await getValidatedSession()

  if (!session) {
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

  // -----------------------------
  // DASHBOARD DOCTOR
  // -----------------------------

  if (isDoctor) {

    const patientsData = await prisma.doctorPatient.findMany({
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

    const patients = patientsData.map(p => {

      const docs = p.patient.documents

      let score = 0

      // 🔥 FIX REAL
      if (!docs || docs.length === 0) {
        score = 0 // 🟢 NO es problema
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

    // 🆕 PACIENTES NUEVOS HOY
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const newPatients = patientsData.filter(p => {
      const createdAt = new Date(p.patient.createdAt)
      return createdAt >= today
    })

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

        {/* 🔴 CRÍTICOS */}
        {criticalPatients.length > 0 && (
          <div className="bg-red-50 border border-red-300 rounded-2xl p-6">

            <h2 className="text-xl font-semibold mb-4 text-red-800">
              🚨 Pacientes de Alta Necesidad
            </h2>

            <div className="space-y-3">
              {criticalPatients.map(p => (
                <Link
                  key={p.id}
                  href={`/dashboard/patients/${p.id}`}
                  className="flex justify-between items-center bg-white border rounded-lg p-4 hover:shadow transition"
                >
                  <div>
                    <p className="font-semibold">{p.name}</p>
                    <p className="text-sm text-gray-500">{p.email}</p>
                  </div>

                  <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm">
                    {p.score}
                  </span>

                </Link>
              ))}
            </div>

          </div>
        )}

        {/* 🆕 NUEVOS */}
        {newPatients.length > 0 && (
          <div className="bg-blue-50 border border-blue-300 rounded-2xl p-6">

            <h2 className="text-xl font-semibold mb-4 text-blue-800">
              🆕 Pacientes nuevos hoy
            </h2>

            <div className="space-y-3">
              {newPatients.map(p => (
                <Link
                  key={p.patient.id}
                  href={`/dashboard/patients/${p.patient.id}`}
                  className="flex justify-between items-center bg-white border rounded-lg p-4 hover:shadow transition"
                >
                  <div>
                    <p className="font-semibold">{p.patient.fullName}</p>
                    <p className="text-sm text-gray-500">{p.patient.email}</p>
                  </div>

                  <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm">
                    Nuevo
                  </span>

                </Link>
              ))}
            </div>

          </div>
        )}

        {/* LISTA GENERAL */}
        <div className="bg-white border rounded-2xl p-8">

          <h2 className="text-xl font-semibold mb-6">
            Mis pacientes
          </h2>

          {patients.length === 0 && (
            <p className="text-gray-500">
              No tienes pacientes todavía.
            </p>
          )}

          <div className="space-y-4">

            {patients
              .sort((a, b) => b.score - a.score)
              .map((p) => (

                <Link
                  key={p.id}
                  href={`/dashboard/patients/${p.id}`}
                  className="block border rounded-lg p-4 hover:bg-gray-50 transition"
                >

                  <div className="flex justify-between items-center">

                    <div>
                      <p className="font-semibold">{p.name}</p>
                      <p className="text-sm text-gray-500">{p.email}</p>
                    </div>

                    <span
                      className={`px-3 py-1 rounded-full text-sm ${
                        p.score >= 70
                          ? "bg-red-100 text-red-700"
                          : p.score >= 30
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-green-100 text-green-700"
                      }`}
                    >
                      {p.score}
                    </span>

                  </div>

                </Link>

              ))}

          </div>

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

      <div className="max-w-5xl mx-auto mt-14">
        <h2 className="text-2xl font-semibold mb-2">Acciones rápidas</h2>
        <p className="text-gray-600 text-lg mb-8">
          Usa estas opciones para gestionar tus estudios médicos.
        </p>

        <div className="grid gap-6 md:grid-cols-3">
          <DashboardCard href="/dashboard/upload" icon="📤" title="Subir estudio médico" description="Laboratorios, radiografías o estudios clínicos" />
          <DashboardCard href="/dashboard/share" icon="👨‍⚕️" title="Enviar estudio a mi médico" description="Comparte tus estudios con tu doctor o familiar" />
          <DashboardCard href="/dashboard/doctors" icon="🩺" title="Mis doctores" description="Consulta los doctores que tienen acceso a tu información" />
        </div>
      </div>

    </div>
  )
}

// COMPONENTES

function DashboardCard({ href, icon, title, description }: any) {
  return (
    <Link href={href} className="bg-white border rounded-3xl p-8 hover:shadow-lg transition text-center block">
      <div className="text-5xl mb-4">{icon}</div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-gray-600 text-lg">{description}</p>
    </Link>
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