import { prisma } from '@/lib/prisma'
import { getValidatedSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

// ==============================
// ✅ APROBAR
// ==============================

async function approveRequest(formData: FormData) {
  'use server'

  const session = await getValidatedSession()

  if (!session?.userId) {
    redirect('/?auth=required')
  }

  const requestId = String(formData.get('requestId'))

  const request = await prisma.medicalAccessRequest.findUnique({
    where: { id: requestId }
  })

  if (!request) return

  await prisma.doctorPatient.create({
    data: {
      doctorId: request.doctorId,
      patientId: request.patientId
    }
  })

  await prisma.medicalAccessRequest.update({
    where: { id: requestId },
    data: { status: "APPROVED" }
  })

  revalidatePath('/dashboard/doctors/requests')
}

// ==============================
// ❌ RECHAZAR
// ==============================

async function rejectRequest(formData: FormData) {
  'use server'

  const session = await getValidatedSession()

  if (!session?.userId) {
    redirect('/?auth=required')
  }

  const requestId = String(formData.get('requestId'))

  await prisma.medicalAccessRequest.update({
    where: { id: requestId },
    data: { status: "REJECTED" }
  })

  revalidatePath('/dashboard/doctors/requests')
}

// ==============================
// 📄 PAGE
// ==============================

export default async function RequestsPage() {

  const session = await getValidatedSession()

  if (!session?.userId) {
    redirect('/?auth=required')
  }

  const userId = session.userId

  const requests = await prisma.medicalAccessRequest.findMany({
    where: {
      patientId: userId,
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

      {/* HEADER */}
      <div className="bg-white border rounded-xl p-6">
        <h1 className="text-2xl font-bold">
          Solicitudes médicas
        </h1>

        <p className="text-gray-500 mt-2">
          Doctores que desean acceso a tus documentos
        </p>
      </div>

      {/* EMPTY */}
      {requests.length === 0 && (
        <div className="bg-white border rounded-xl p-6">
          <p className="text-gray-500">
            No tienes solicitudes pendientes.
          </p>
        </div>
      )}

      {/* LISTA */}
      <div className="space-y-4">

        {requests.map((req) => {

          if (!req.doctor) return null

          return (

            <div
              key={req.id}
              className="bg-white border rounded-xl p-6 flex flex-col md:flex-row md:justify-between md:items-center gap-4"
            >

              {/* INFO */}
              <div>
                <p className="font-semibold text-lg">
                  {req.doctor.fullName}
                </p>

                <p className="text-gray-500">
                  {req.doctor.email}
                </p>
              </div>

              {/* BOTONES */}
              <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">

                {/* APROBAR */}
                <form action={approveRequest} className="w-full sm:w-auto">
                  <input type="hidden" name="requestId" value={req.id} />

                  <button className="bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 w-full sm:w-auto">
                    Aprobar
                  </button>
                </form>

                {/* RECHAZAR */}
                <form action={rejectRequest} className="w-full sm:w-auto">
                  <input type="hidden" name="requestId" value={req.id} />

                  <button className="bg-red-100 text-red-700 px-4 py-3 rounded-lg hover:bg-red-200 w-full sm:w-auto">
                    Rechazar
                  </button>
                </form>

              </div>

            </div>

          )
        })}

      </div>

    </div>
  )
}