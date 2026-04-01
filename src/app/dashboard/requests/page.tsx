import { prisma } from '@/lib/prisma'
import { getValidatedSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'


async function requestAccess(formData: FormData) {
  'use server'

  const session = await getValidatedSession()

  // ✅ FIX CRÍTICO (server action)
  if (!session?.userId) {
    throw new Error("Unauthorized")
  }

  const doctorId = session.userId

  const doctor = await prisma.user.findUnique({
    where: { id: doctorId }
  })

  if (!doctor || doctor.role !== 'DOCTOR') {
    throw new Error("Unauthorized")
  }

  const email = String(formData.get('email') || '')
    .toLowerCase()
    .trim()

  if (!email) return

  const patient = await prisma.user.findUnique({
    where: { email }
  })

  if (!patient || patient.role !== 'PATIENT') {
    return
  }

  // Ya tiene acceso
  const alreadyAuthorized = await prisma.doctorPatient.findFirst({
    where: {
      doctorId,
      patientId: patient.id
    }
  })

  if (alreadyAuthorized) return

  // Ya existe solicitud
  const existingRequest = await prisma.medicalAccessRequest.findFirst({
    where: {
      doctorId,
      patientId: patient.id
    }
  })

  if (existingRequest) return

  // Crear solicitud
  await prisma.medicalAccessRequest.create({
    data: {
      doctorId,
      patientId: patient.id
    }
  })

  revalidatePath('/dashboard/request-access')
}


export default async function RequestAccessPage() {

  const session = await getValidatedSession()

  // ✅ FIX CRÍTICO (page)
  if (!session?.userId) {
    redirect('/?auth=required')
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId }
  })

  if (!user || user.role !== 'DOCTOR') {
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

  return (

    <div className="max-w-5xl mx-auto space-y-8">

      {/* Header */}
      <div className="bg-white border rounded-xl p-6">

        <h1 className="text-2xl font-bold">
          Solicitar acceso a paciente
        </h1>

        <p className="text-gray-500 mt-2">
          Busca un paciente por su email para solicitar acceso a sus documentos médicos.
        </p>

      </div>

      {/* Formulario */}
      <div className="bg-white border rounded-xl p-6">

        <h2 className="font-semibold mb-4">
          Nueva solicitud
        </h2>

        <form action={requestAccess} className="flex gap-4">

          <input
            name="email"
            type="email"
            placeholder="Email del paciente"
            required
            className="border rounded-lg px-4 py-2 flex-1"
          />

          <button
            className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700"
          >
            Solicitar acceso
          </button>

        </form>

      </div>

      {/* Solicitudes */}
      <div className="bg-white border rounded-xl p-6">

        <h2 className="font-semibold mb-6">
          Solicitudes enviadas
        </h2>

        {requests.length === 0 && (
          <p className="text-gray-500">
            No has enviado solicitudes todavía.
          </p>
        )}

        <div className="space-y-4">

          {requests.map((req: any) => (

            <div
              key={req.id}
              className="border rounded-lg p-4 flex justify-between items-center"
            >

              <div>
                <p className="font-semibold">
                  {req.patient.fullName}
                </p>

                <p className="text-sm text-gray-500">
                  {req.patient.email}
                </p>
              </div>

              <div className="text-sm font-semibold">

                {req.status === "PENDING" && (
                  <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-lg">
                    Pendiente
                  </span>
                )}

                {req.status === "APPROVED" && (
                  <span className="bg-green-100 text-green-700 px-3 py-1 rounded-lg">
                    Aprobado
                  </span>
                )}

                {req.status === "REJECTED" && (
                  <span className="bg-red-100 text-red-700 px-3 py-1 rounded-lg">
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