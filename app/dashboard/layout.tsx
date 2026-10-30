import { doctorAlertSummary } from '@/lib/doctor-alert-summary'
import type { AlertSummary } from '@/lib/alert-summary'
import { getLicenseAccess } from '@/lib/license-access'
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

  const entitlement = await getLicenseAccess(user.id)
  const isDoctor = user.role === Role.DOCTOR
  const isAdmin = user.role === Role.ADMIN

  let alertSummary: AlertSummary = { alerts: [], total: 0, status: entitlement.active ? 'ready' : 'license-required' }
  if (isDoctor && entitlement.active) {
    try { alertSummary = await doctorAlertSummary(user.id) }
    catch { alertSummary = { alerts: [], total: 0, status: 'error' } }
  }

  const identityCount = isAdmin ? await prisma.identityReview.count({ where: { status: 'PENDING' } }) : 0

  return (

    <div className="min-h-screen bg-gray-50">

      {isAdmin && identityCount > 0 && <Link href="/dashboard/admin/identity" role="status" className="block bg-amber-100 p-4 text-center font-semibold text-amber-950">{identityCount} registros pendientes de verificación de identidad · Revisar</Link>}
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
          <div className="hidden lg:flex flex-wrap justify-end items-center gap-x-4 gap-y-2 text-base">

            {!isAdmin && (
              <Link href="/dashboard">
                Inicio
              </Link>
            )}

            {!isDoctor && !isAdmin && (
              <>
                <Link href="/dashboard/profile">Mi información de salud</Link>
                <Link href="/dashboard/dependents">Personas a mi cargo</Link>
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

                <Link href="/dashboard/admin/licenses">Licencias</Link>
                <Link href="/dashboard/admin/identity">Verificar identidad</Link>
                <Link href="/dashboard/admin/guardians">Padres y tutores</Link>
                <Link href="/dashboard/admin/interoperability">Interoperabilidad</Link>
                <Link href="/dashboard/admin/integrations">Integraciones</Link>

                <Link href="/dashboard/admin/logs">
                  Logs
                </Link>

                <Link href="/dashboard/admin/alerts">
                  Alertas
                </Link>
              </>
            )}

            {isDoctor && <NotificationBell summary={alertSummary} variant="desktop" />}

            <form action={logout}>
              <button className="text-red-600">
                Salir
              </button>
            </form>

          </div>

          {/* 🔥 MOBILE MENU */}
          <MobileMenu
            isDoctor={isDoctor}
            isStaff={user.role === Role.STAFF}
            isAdmin={isAdmin}
            alertSummary={alertSummary}
            NotificationBell={NotificationBell}
            logout={logout}
          />

        </div>

      </nav>

      <main className="max-w-6xl mx-auto min-w-0 px-4 py-6 sm:p-8">
        {!isAdmin && !entitlement.active && user.email !== 'doctor_demo@enlace.com' && <div role="status" className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-5 text-amber-950">
          <p className="font-semibold">Licencia inactiva · Solo listado histórico</p>
          <p>{entitlement.cutoff && entitlement.cutoff.getTime() > 0 ? `Documentos cargados antes del ${entitlement.cutoff.toLocaleString('es-PR', { timeZone: 'America/Puerto_Rico' })}.` : 'No hay un período de licencia anterior registrado.'} No puedes abrir ni descargar archivos, enviar solicitudes o realizar nuevas acciones. Puede haber documentos posteriores no visibles. Renueva tu licencia para recuperar las funciones.</p>
        </div>}
        {children}
      </main>

    </div>
  )
}
