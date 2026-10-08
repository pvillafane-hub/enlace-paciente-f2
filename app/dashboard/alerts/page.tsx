import { clinicDoctorId } from '@/lib/access'
import { prisma } from '@/lib/prisma'
import { getValidatedSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { resolveAlert } from './actions'
import ConfirmUserForm from '../admin/users/ConfirmUserForm'

export default async function AlertsPage({ searchParams }: { searchParams: Promise<{ page?: string; historyPage?: string }> }) {
  const params = await searchParams
  const pageNumber = (value?: string) => /^\d{1,4}$/.test(value || "") ? Math.max(1, Number(value)) : 1
  const page = pageNumber(params.page), historyPage = pageNumber(params.historyPage)

  const session = await getValidatedSession()

  if (!session) {
    redirect('/?auth=required')
  }

  // 🔥 FIX CRÍTICO
  if (!session.userId) {
    redirect('/?auth=required')
  }

  const actor = await prisma.user.findUnique({ where: { id: session.userId } })
  const doctorId = actor ? await clinicDoctorId(actor) : null
  if (!doctorId) redirect('/dashboard')

  const where = { doctorId, patient: { active: true, role: 'PATIENT' as const, patientDoctors: { some: { doctorId } } } }
  const [activeAlerts, resolvedAlerts, activeCount, resolvedCount] = await Promise.all([
    prisma.medicalAlert.findMany({ where: { ...where, resolved: false }, include: { patient: true }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 50, skip: (page - 1) * 50 }),
    prisma.medicalAlert.findMany({ where: { ...where, resolved: true }, include: { patient: true }, orderBy: [{ resolvedAt: 'desc' }, { id: 'desc' }], take: 50, skip: (historyPage - 1) * 50 }),
    prisma.medicalAlert.count({ where: { ...where, resolved: false } }),
    prisma.medicalAlert.count({ where: { ...where, resolved: true } }),
  ])

  return (

    <div className="max-w-5xl mx-auto space-y-10">

      <div className="bg-white border rounded-xl p-6">
        <h1 className="text-2xl font-bold">
          🚨 Alertas médicas
        </h1>
      </div>

      {/* 🔴 ACTIVAS */}

      <div className="space-y-4">

        <h2 className="text-xl font-semibold">
          Alertas activas ({activeCount})
        </h2>

        {activeAlerts.length === 0 && (
          <p className="text-gray-500">
            No hay alertas activas en esta página
          </p>
        )}

        {activeAlerts.map(alert => (

          <div
            key={alert.id}
            className="bg-red-50 border border-red-300 rounded-xl p-6"
          >

            <div className="flex justify-between items-center">

              <Link
                href={`/dashboard/patients/${alert.patient.id}`}
                className="font-semibold text-lg"
              >
                🔴 {alert.patient.fullName}
              </Link>

              <ConfirmUserForm action={resolveAlert.bind(null, alert.id)} message={`Marcar como resuelta la alerta de ${alert.patient.fullName}. Abrir un expediente no resuelve una alerta automáticamente.`}>
                <button className="text-sm bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700">
                  Resolver
                </button>
              </ConfirmUserForm>

            </div>

            <p className="text-red-700 mt-2">
              {alert.type}
            </p>

            <p className="text-xs text-gray-500 mt-2">
              {new Date(alert.createdAt).toLocaleString()}
            </p>

          </div>

        ))}

      </div>

      <div className="flex gap-4" aria-label="Páginas de alertas activas">
        {page > 1 && <Link href={`?page=${page - 1}&historyPage=${historyPage}`}>Anteriores</Link>}
        {page * 50 < activeCount && <Link href={`?page=${page + 1}&historyPage=${historyPage}`}>Siguientes</Link>}
      </div>
      {/* ✅ RESUELTAS */}

      <div className="space-y-4">

        <h2 className="text-xl font-semibold">
          Historial ({resolvedCount})
        </h2>

        {resolvedAlerts.length === 0 && (
          <p className="text-gray-500">
            No hay alertas resueltas
          </p>
        )}

        {resolvedAlerts.map(alert => (

          <div
            key={alert.id}
            className="bg-gray-50 border rounded-xl p-6 opacity-70"
          >

            <p className="font-semibold">
              {alert.patient.fullName}
            </p>

            <p className="text-gray-600">
              {alert.type}
            </p>

            <p className="text-xs text-gray-400 mt-2">
              Resuelta: {alert.resolvedAt
                ? new Date(alert.resolvedAt).toLocaleString()
                : ""}
            </p>

          </div>

        ))}

      </div>

      <nav className="flex gap-4" aria-label="Páginas del historial">
        {historyPage > 1 && <Link href={`?page=${page}&historyPage=${historyPage - 1}`}>Anteriores</Link>}
        {historyPage * 50 < resolvedCount && <Link href={`?page=${page}&historyPage=${historyPage + 1}`}>Siguientes</Link>}
      </nav>
    </div>
  )
}