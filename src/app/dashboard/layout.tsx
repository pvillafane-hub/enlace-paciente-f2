import NotificationBell from "@/components/NotificationBell"
import { prisma } from "@/lib/prisma"
import { getValidatedSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { logout } from "@/app/logout/actions"
import { Role } from "@prisma/client"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {

  const session = await getValidatedSession()

  if (!session) {
    redirect("/?auth=required")
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId }
  })

  if (!user) {
    redirect("/")
  }

  const isDoctor = user.role === Role.DOCTOR
  const isAdmin = user.role === Role.ADMIN

  // 🔔 ALERTAS (solo doctor)
  let alerts: {
    id: string
    type: string
    patientName: string
    patientId: string
  }[] = []

  if (isDoctor) {
    const alertsData = await prisma.medicalAlert.findMany({
      where: {
        doctorId: user.id,
        resolved: false
      },
      include: {
        patient: true
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 5
    })

    alerts = alertsData.map(a => ({
      id: a.id,
      type: a.type,
      patientName: a.patient.fullName,
      patientId: a.patient.id
    }))
  }

  return (

    <div className="min-h-screen bg-gray-50">

      <nav className="bg-white border-b">

        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">

          <Link
            href="/dashboard"
            className="text-2xl font-bold text-blue-700"
          >
            Enlace Salud
          </Link>

          <div className="flex items-center gap-8 text-lg">

             {!isAdmin && (
               <Link href="/dashboard">
                Inicio
               </Link>
             )}

            {/* PACIENTE */}
            {!isDoctor && !isAdmin && (
              <>
                <Link href="/dashboard/doctors">
                  Mis doctores
                </Link>

                <Link href="/dashboard/security">
                  Seguridad
                </Link>
              </>
            )}

            {/* DOCTOR */}
            {isDoctor && (
              <>
                <Link href="/dashboard/patients">
                  Pacientes
                </Link>

                <Link href="/dashboard/requests">
                  Solicitudes
                </Link>

                <Link href="/dashboard/reports">
                  Reportes
                </Link>
              </>
            )}

            {/* ADMIN 🔥 */}
            {isAdmin && (
              <>
                <Link href="/dashboard/admin/users">
                  Usuarios
                </Link>

                <Link href="/dashboard/admin/logs">
                  Logs
                </Link>

                <Link href="/dashboard/admin/alerts">
                  Alertas
                </Link>
              </>
            )}

            {/* 🔔 CAMPANITA (solo doctor) */}
            {isDoctor && <NotificationBell alerts={alerts} />}

            {/* LOGOUT */}
            <form action={logout}>
              <button className="text-red-600">
                Salir
              </button>
            </form>

          </div>

        </div>

      </nav>

      <main className="max-w-6xl mx-auto p-8">
        {children}
      </main>

    </div>
  )
}