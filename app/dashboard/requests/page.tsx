import { prisma } from '@/lib/prisma'
import { getValidatedSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import QRScannerClient from './QRScannerClient'
import Link from 'next/link'
import { requireAuditedDoctorAccessForActor, MedicalAccessDeniedError } from '@/lib/multitenant-access'

// ==============================
// 🔐 SERVER ACTION
// ==============================

async function requestAccess(formData: FormData) {
  'use server'

  const session = await getValidatedSession()

  if (!session?.userId) {
    throw new Error("Unauthorized")
  }

  const doctorId = session.userId

  const doctor = await prisma.user.findUnique({
    where: { id: doctorId }
  })

  if (!doctor?.active || doctor.role !== 'DOCTOR') {
    throw new Error("Unauthorized")
  }

  const email = String(formData.get('email') || '')
    .toLowerCase()
    .trim()

  if (!email) return

  const patient = await prisma.user.findUnique({
    where: { email }
  })

  if (!patient?.active || patient.role !== 'PATIENT') {
    return
  }

  try {
    await requireAuditedDoctorAccessForActor({ actorId: doctorId, patientId: patient.id, operation: 'READ_RECORD' })
    return
  } catch (error) {
    if (!(error instanceof MedicalAccessDeniedError)) throw error
  }

  const existingRequest = await prisma.medicalAccessRequest.findFirst({
    where: {
      doctorId,
      patientId: patient.id
    }
  })

  if (existingRequest) return

  await prisma.medicalAccessRequest.create({
    data: {
      doctorId,
      patientId: patient.id
    }
  })

  revalidatePath('/dashboard/requests')
}

// ==============================
// 📄 PAGE
// ==============================

export default async function RequestAccessPage() {

  const session = await getValidatedSession()

  if (!session?.userId) {
    redirect('/?auth=required')
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId }
  })

  if (!user?.active || user.role !== 'DOCTOR') {
    redirect('/dashboard')
  }

  const requests = await prisma.medicalAccessRequest.findMany({
    where: {
      doctorId: user.id
    },
    include: {
      patient: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  })

  const grants = await prisma.medicalAccessGrant.findMany({
    where: {
      doctorId: user.id, status: 'ACTIVE', revokedAt: null,
      OR: [{ validUntil: null }, { validUntil: { gt: new Date() } }],
      organization: { status: 'ACTIVE' }, patient: { active: true },
    },
    select: { patientId: true, patient: { select: { fullName: true, email: true } } },
    distinct: ['patientId'],
  })
  const authorized = (await Promise.all(grants.map(async grant => {
    try {
      await requireAuditedDoctorAccessForActor({ actorId: user.id, patientId: grant.patientId, operation: 'READ_RECORD' })
      return grant
    } catch (error) {
      if (error instanceof MedicalAccessDeniedError) return null
      throw error
    }
  }))).filter((grant): grant is NonNullable<typeof grant> => grant !== null)

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
          Pacientes con acceso autorizado
        </h2>

        {authorized.length === 0 && requests.length === 0 && (
          <p className="text-gray-500">
            No hay autorizaciones ni solicitudes pendientes.
          </p>
        )}

        <div className="space-y-4">

          {authorized.map(grant => (
            <div key={grant.patientId} className="border rounded-lg p-4 flex justify-between items-center gap-4">
              <div><p className="font-semibold">{grant.patient.fullName}</p><p className="text-sm text-gray-500">{grant.patient.email}</p></div>
              <div className="flex items-center gap-3"><span className="text-sm text-green-700 font-semibold">Acceso autorizado</span><Link className="text-sm text-blue-700 underline" href={`/dashboard/patients/${grant.patientId}`}>Ver expediente</Link></div>
            </div>
          ))}
          {requests.filter(req => req.status === 'PENDING').map((req: any) => (

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

    </div>
  )
}