import Link from 'next/link'
import { RequestStatus } from '@prisma/client'
import { sendRequest } from './actions'
import { prisma } from '@/lib/prisma'
import { getValidatedSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import QRScannerClient from './QRScannerClient'

// ==============================
// 🔐 SERVER ACTION
// ==============================

async function requestAccess(formData: FormData) {
  'use server'
  await sendRequest(String(formData.get('email') || ''))
}

// ==============================
// 📄 PAGE
// ==============================

export default async function RequestAccessPage({ searchParams }: { searchParams: Promise<{ status?: string; page?: string }> }) {
  const params = await searchParams
  const status = Object.values(RequestStatus).includes(params.status as RequestStatus) ? params.status as RequestStatus : undefined
  const page = /^\d{1,4}$/.test(params.page || '') ? Math.max(1, Number(params.page)) : 1

  const session = await getValidatedSession()

  if (!session?.userId) {
    redirect('/?auth=required')
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId }
  })

  if (!user || user.role !== 'DOCTOR') {
    redirect('/dashboard')
  }

  const where = { doctorId: user.id, ...(status ? { status } : {}) }
  const totalRequests = await prisma.medicalAccessRequest.count({ where })
  const requests = await prisma.medicalAccessRequest.findMany({
    where,
    take: 50, skip: (page - 1) * 50,
    include: {
      patient: { select: { id: true, fullName: true, email: true } }
    },
    orderBy: {
      createdAt: 'desc'
    }
  })

  return (

    <div className="max-w-5xl mx-auto space-y-8">

      {/* HEADER */}
      <div className="bg-white border rounded-xl p-6">
        <h1 className="text-2xl font-bold">
          Acceso seguro a pacientes
        </h1>

        <p className="text-gray-500 mt-2">
          Solicita acceso seguro a la información clínica del paciente mediante autorización.
        </p>
      </div>

      {/* FORMULARIO */}
      <div className="bg-white border rounded-xl p-6">

        <h2 className="font-semibold mb-4">
          Nueva solicitud
        </h2>

        <form action={requestAccess} className="flex flex-col md:flex-row gap-3">

          <input
            name="email"
            type="email"
            placeholder="Email del paciente"
            required
            className="border rounded-lg px-4 py-3 flex-1"
          />

          <button
            className="bg-blue-600 text-white px-5 py-3 rounded-lg hover:bg-blue-700 w-full md:w-auto"
          >
            Solicitar acceso
          </button>

        </form>

        {/* 🔥 NUEVO: QR SCANNER */}
        <div className="mt-6 border-t pt-6">

          <h3 className="font-semibold mb-3">
            Escanear código del paciente
          </h3>

          <QRScannerClient />

        </div>

        {/* 🔐 HIPAA NOTE */}
        <p className="text-xs text-gray-400 mt-3">
          El acceso a la información clínica requiere autorización del paciente.
        </p>

      </div>

      {/* LISTA */}
      <div className="bg-white border rounded-xl p-6">

        <h2 className="font-semibold mb-6">
          Historial de solicitudes ({totalRequests})
        </h2>

        <form method="GET" className="flex gap-3 mb-4">
          <select name="status" defaultValue={status || ''} aria-label="Estado de la solicitud" className="border p-2 rounded">
            <option value="">Todos los estados</option><option value="PENDING">Pendientes</option><option value="APPROVED">Autorizadas</option><option value="REJECTED">Rechazadas</option>
          </select><button className="border p-2 rounded">Filtrar</button>
        </form>
        {requests.length === 0 && (
          <p className="text-gray-500">
            No hay solicitudes para estos filtros en esta página.
          </p>
        )}

        <div className="space-y-4">

          {requests.map((req) => (

            <div
              key={req.id}
              className="border rounded-lg p-4 flex justify-between items-start md:items-center gap-4 hover:shadow-md transition"
            >

              {/* INFO */}
              <div>
                <p className="font-semibold">
                  {req.patient.fullName}
                </p>

                <p className="text-sm text-gray-500">
                  {req.patient.email}
                </p>

                {req.status === "APPROVED" && (
                  <p className="text-xs text-gray-500 mt-1">
                    Autorizado
                  </p>
                )}
              </div>

              {/* STATUS */}
              <div className="text-sm font-semibold flex-shrink-0">

                {req.status === "PENDING" && (
                  <span className="bg-yellow-100 text-yellow-700 px-3 py-2 rounded-lg inline-block">
                    Solicitud enviada
                  </span>
                )}

                {req.status === "APPROVED" && (
                  <span className="bg-green-100 text-green-700 px-3 py-2 rounded-lg inline-block">
                    Acceso autorizado
                  </span>
                )}

                {req.status === "REJECTED" && (
                  <span className="bg-red-100 text-red-700 px-3 py-2 rounded-lg inline-block">
                    Rechazado
                  </span>
                )}

              </div>

            </div>

          ))}

        </div>

      </div>

      <nav className="flex gap-4" aria-label="Páginas de solicitudes">
        {page > 1 && <Link href={`?page=${page - 1}&status=${status || ''}`}>Anteriores</Link>}
        {page * 50 < totalRequests && <Link href={`?page=${page + 1}&status=${status || ''}`}>Siguientes</Link>}
      </nav>
    </div>
  )
}