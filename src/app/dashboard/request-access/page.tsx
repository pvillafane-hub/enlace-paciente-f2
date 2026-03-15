import { prisma } from '@/lib/prisma'
import { getValidatedSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'


async function requestAccess(formData: FormData) {
  'use server'

  const session = await getValidatedSession()

  if (!session) redirect('/?auth=required')

  const user = await prisma.user.findUnique({
    where: { id: session.userId }
  })

  if (!user || user.role !== 'DOCTOR') {
    redirect('/dashboard')
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

  // Verificar si ya existe solicitud

  const existing = await prisma.medicalAccessRequest.findFirst({
    where: {
      doctorId: user.id,
      patientId: patient.id,
      status: "PENDING"
    }
  })

  if (existing) return

  // Crear solicitud

  await prisma.medicalAccessRequest.create({
    data: {
      doctorId: user.id,
      patientId: patient.id
    }
  })

  revalidatePath('/dashboard/request-access')
}



export default async function RequestAccessPage() {

  const session = await getValidatedSession()

  if (!session) redirect('/?auth=required')

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


      {/* Solicitudes enviadas */}

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
                  <span className="text-yellow-600">
                    Pendiente
                  </span>
                )}

                {req.status === "APPROVED" && (
                  <span className="text-green-600">
                    Aprobado
                  </span>
                )}

                {req.status === "REJECTED" && (
                  <span className="text-red-600">
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