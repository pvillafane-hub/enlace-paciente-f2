import { prisma } from '@/lib/prisma'
import { getValidatedSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

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

  const alreadyAuthorized = await prisma.doctorPatient.findFirst({
    where: {
      doctorId,
      patientId: patient.id
    }
  })

  if (alreadyAuthorized) return

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

  revalidatePath('/dashboard/request-access')
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

      {/* HEADER */}
      <div className="bg-white border rounded-xl p-6">
        <h1 className="text-2xl font-bold">
          Solicitar acceso a paciente
        </h1>

        <p className="text-gray-500 mt-2">
          Busca un paciente por su email para solicitar acceso a sus documentos médicos.
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

      </div>

      {/* LISTA */}
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
              className="border rounded-lg p-4 flex flex-col md:flex-row md:justify-between md:items-center gap-3"
            >

              {/* INFO */}
              <div>
                <p className="font-semibold">
                  {req.patient.fullName}
                </p>

                <p className="text-sm text-gray-500">
                  {req.patient.email}
                </p>
              </div>

              {/* STATUS */}
              <div className="text-sm font-semibold w-full md:w-auto">

                {req.status === "PENDING" && (
                  <span className="bg-yellow-100 text-yellow-700 px-3 py-2 rounded-lg block md:inline text-center">
                    Pendiente
                  </span>
                )}

                {req.status === "APPROVED" && (
                  <span className="bg-green-100 text-green-700 px-3 py-2 rounded-lg block md:inline text-center">
                    Aprobado
                  </span>
                )}

                {req.status === "REJECTED" && (
                  <span className="bg-red-100 text-red-700 px-3 py-2 rounded-lg block md:inline text-center">
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