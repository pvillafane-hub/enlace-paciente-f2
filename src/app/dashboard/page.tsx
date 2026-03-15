import Link from "next/link"
import DashboardView from "./DashboardView"
import { prisma } from "@/lib/prisma"
import { getValidatedSession } from "@/lib/auth"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic";

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

  const isDoctor = userData.role === "DOCTOR"

  // 🔐 Verificar passkey
  const passkey = await prisma.authMethod.findFirst({
    where: { userId: session.userId }
  })

  const passkeyEnabled = Boolean(passkey)

  // -----------------------------
  // DASHBOARD DOCTOR
  // -----------------------------

  if (isDoctor) {

    const patients = await prisma.doctorPatient.findMany({
      where: {
        doctorId: userData.id
      },
      include: {
        patient: true
      }
    })

    return (

      <div className="space-y-10">

        <div>

          <h1 className="text-3xl font-bold">
            Dashboard del Doctor
          </h1>

          <p className="text-gray-500 mt-2">
            Resumen de actividad de tus pacientes
          </p>

        </div>

        {/* Estadísticas */}

        <div className="grid md:grid-cols-3 gap-6">

          <StatCard
            title="Pacientes activos"
            value={patients.length}
          />

          <StatCard
            title="Consultas recientes"
            value={patients.length}
          />

          <StatCard
            title="Actividad"
            value="Activa"
          />

        </div>

        {/* Pacientes */}

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

            {patients.map((p) => (

              <Link
                key={p.id}
                href={`/dashboard/patients/${p.patient.id}`}
                className="block border rounded-lg p-4 hover:bg-gray-50 transition"
              >

                <div className="flex justify-between">

                  <div>

                    <p className="font-semibold">
                      {p.patient.fullName}
                    </p>

                    <p className="text-sm text-gray-500">
                      {p.patient.email}
                    </p>

                  </div>

                  <span className="text-sm text-gray-400">
                    Ver expediente →
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

  const user = {
    ...userData,
    documents: userData.documents.map(doc => ({
      ...doc,
      studyDate: new Date(doc.studyDate)
    }))
  }

  return (

    <div className="space-y-10">

      {/* PANEL DEL PACIENTE */}

      <DashboardView
        user={user}
        passkeyEnabled={passkeyEnabled}
      />

      {/* ACCIONES RÁPIDAS */}

      <div className="max-w-5xl mx-auto mt-14">

        <h2 className="text-2xl font-semibold mb-2">
          Acciones rápidas
        </h2>

        <p className="text-gray-600 text-lg mb-8">
          Usa estas opciones para gestionar tus estudios médicos.
        </p>

        <div className="grid gap-6 md:grid-cols-2">

          <DashboardCard
            href="/dashboard/upload"
            icon="📤"
            title="Subir estudio médico"
            description="Laboratorios, radiografías o estudios clínicos"
          />

          <DashboardCard
            href="/dashboard/share"
            icon="👨‍⚕️"
            title="Enviar estudio a mi médico"
            description="Comparte tus estudios con tu doctor o familiar"
          />

        </div>

      </div>

    </div>
  )
}

function DashboardCard({
  href,
  icon,
  title,
  description,
}: {
  href: string
  icon: string
  title: string
  description: string
}) {
  return (
    <Link
      href={href}
      className="bg-white border rounded-3xl p-8 hover:shadow-lg transition text-center block"
    >

      <div className="text-5xl mb-4">
        {icon}
      </div>

      <h3 className="text-xl font-semibold mb-2">
        {title}
      </h3>

      <p className="text-gray-600 text-lg">
        {description}
      </p>

    </Link>
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

    <div className="bg-white rounded-xl p-6 shadow-sm border">

      <p className="text-gray-500 text-sm">
        {title}
      </p>

      <p className="text-3xl font-bold mt-2">
        {value}
      </p>

    </div>

  )
}