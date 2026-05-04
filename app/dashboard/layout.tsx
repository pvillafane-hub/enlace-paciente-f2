import NotificationBell from "@/components/NotificationBell"
import MobileMenu from "@/components/MobileMenu"
import { prisma } from "@/lib/prisma"
import { getValidatedSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { logout } from "app/logout/actions"
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

          {/* LOGO */}
          <Link
            href="/dashboard"
            className="text-2xl font-bold text-blue-700"
          >
            Enlace Salud
          </Link>

          {/* 🔥 DESKTOP MENU */}
          <div className="hidden md:flex items-center gap-8 text-lg">

            {!isAdmin && (
              <Link href="/dashboard">
                Inicio
              </Link>
            )}

            {!isDoctor && !isAdmin && (
              <>
                <Link href="/dashboard/doctors">
                  Mis doctores
                </Link>

                <Link href="/dashboard/security">
                  Seguridad
                </Link>

                {/* 🔥 NUEVO TAB QR */}
                <Link
                  href="/dashboard/qr"
                  className="font-semibold text-blue-700"
                >
                  Mostrar código
                </Link>
              </>
            )}

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

            {isDoctor && <NotificationBell alerts={alerts} />}

            <form action={logout}>
              <button className="text-red-600">
                Salir
              </button>
            </form>

          </div>

          {/* 🔥 MOBILE MENU */}
          <MobileMenu
            isDoctor={isDoctor}
            isAdmin={isAdmin}
            alerts={alerts}
            NotificationBell={NotificationBell}
            logout={logout}
          />

        </div>

      </nav>

      <main className="max-w-6xl mx-auto p-8">
        {children}
      </main>

    </div>
  )
}