import { prisma } from '@/lib/prisma'
import { getValidatedSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'


async function approveRequest(formData: FormData) {
  'use server'

  const session = await getValidatedSession()

  if (!session) redirect('/?auth=required')

  const requestId = String(formData.get('requestId'))

  const request = await prisma.medicalAccessRequest.findUnique({
    where: { id: requestId }
  })

  if (!request) return

  // Crear acceso real

  await prisma.doctorPatient.create({
    data: {
      doctorId: request.doctorId,
      patientId: request.patientId
    }
  })

  // Cambiar estado

  await prisma.medicalAccessRequest.update({
    where: { id: requestId },
    data: {
      status: "APPROVED"
    }
  })

  revalidatePath('/dashboard/requests')
}


async function rejectRequest(formData: FormData) {
  'use server'

  const session = await getValidatedSession()

  if (!session) redirect('/?auth=required')

  const requestId = String(formData.get('requestId'))

  await prisma.medicalAccessRequest.update({
    where: { id: requestId },
    data: {
      status: "REJECTED"
    }
  })

  revalidatePath('/dashboard/requests')
}



export default async function RequestsPage() {

  const session = await getValidatedSession()

  if (!session) redirect('/?auth=required')

  const requests = await prisma.medicalAccessRequest.findMany({
    where: {
      patientId: session.userId,
      status: "PENDING"
    },
    include: {
      doctor: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  })

  return (

    <div className="max-w-5xl mx-auto space-y-8">

      <div className="bg-white border rounded-xl p-6">

        <h1 className="text-2xl font-bold">
          Solicitudes médicas
        </h1>

        <p className="text-gray-500 mt-2">
          Doctores que desean acceso a tus documentos
        </p>

      </div>


      {requests.length === 0 && (

        <div className="bg-white border rounded-xl p-6">

          <p className="text-gray-500">
            No tienes solicitudes pendientes.
          </p>

        </div>

      )}


      <div className="space-y-4">

        {requests.map((req) => (

          <div
            key={req.id}
            className="bg-white border rounded-xl p-6 flex justify-between items-center"
          >

            <div>

              <p className="font-semibold text-lg">
                {req.doctor.fullName}
              </p>

              <p className="text-gray-500">
                {req.doctor.email}
              </p>

            </div>


            <div className="flex gap-3">

              <form action={approveRequest}>

                <input
                  type="hidden"
                  name="requestId"
                  value={req.id}
                />

                <button
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                >
                  Aprobar
                </button>

              </form>


              <form action={rejectRequest}>

                <input
                  type="hidden"
                  name="requestId"
                  value={req.id}
                />

                <button
                  className="bg-red-100 text-red-700 px-4 py-2 rounded-lg hover:bg-red-200"
                >
                  Rechazar
                </button>

              </form>

            </div>

          </div>

        ))}

      </div>

    </div>
  )
}