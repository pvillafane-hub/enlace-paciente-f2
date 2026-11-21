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
          <div className="hidden md:flex items-center gap-4 text-base">

            {!isAdmin && (
              <Link href="/dashboard">
                Inicio
              </Link>
            )}

            {!isDoctor && !isAdmin && (
              <>
                <Link href="/dashboard/profile" className="font-semibold text-blue-700">Mi información</Link>
                <Link href="/dashboard/representados">Mis representados</Link>
                <Link href="/dashboard/mis-representantes">Mis autorizaciones</Link>
                <Link href="/dashboard/multitenant/mis-medicos">
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
              <details className="group relative">
                <summary className="cursor-pointer list-none rounded-lg px-4 py-2 font-semibold text-slate-700 hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600">
                  Administración <span aria-hidden="true" className="ml-1 text-sm">▾</span>
                </summary>
                <div className="absolute right-0 top-full z-50 mt-2 grid w-64 gap-1 rounded-xl border border-slate-200 bg-white p-2 text-sm shadow-xl">
                  <Link className="rounded-lg px-3 py-2 hover:bg-blue-50" href="/dashboard/admin/clinics">Clínicas</Link>
                  <Link className="rounded-lg px-3 py-2 hover:bg-blue-50" href="/dashboard/admin/licenses">Licencias</Link>
                  <Link className="rounded-lg px-3 py-2 hover:bg-blue-50" href="/dashboard/admin/guardians">Padres y tutores</Link>
                  <Link className="rounded-lg px-3 py-2 hover:bg-blue-50" href="/dashboard/admin/identity">Identidad</Link>
                  <Link className="rounded-lg px-3 py-2 hover:bg-blue-50" href="/dashboard/admin/interoperability">Interoperabilidad</Link>
                  <Link className="rounded-lg px-3 py-2 hover:bg-blue-50" href="/dashboard/admin/integrations">Integraciones</Link>
                  <Link className="rounded-lg px-3 py-2 hover:bg-blue-50" href="/dashboard/admin/users">Usuarios</Link>
                  <Link className="rounded-lg px-3 py-2 hover:bg-blue-50" href="/dashboard/admin/logs">Logs</Link>
                  <Link className="rounded-lg px-3 py-2 hover:bg-blue-50" href="/dashboard/admin/alerts">Alertas</Link>
                </div>
              </details>
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