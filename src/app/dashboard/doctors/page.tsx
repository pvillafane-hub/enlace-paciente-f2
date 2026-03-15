import { prisma } from '@/lib/prisma'
import { getValidatedSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'


async function addDoctor(formData: FormData) {
  'use server'

  const session = await getValidatedSession()

  if (!session) {
    redirect('/?auth=required')
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId }
  })

  if (!user || user.role !== 'PATIENT') {
    redirect('/dashboard')
  }

  const email = String(formData.get('email') || '')
    .toLowerCase()
    .trim()

  if (!email) return

  const doctor = await prisma.user.findUnique({
    where: { email }
  })

  if (!doctor || doctor.role !== 'DOCTOR') {
    return
  }

  const existing = await prisma.doctorPatient.findFirst({
    where: {
      doctorId: doctor.id,
      patientId: user.id
    }
  })

  if (existing) return

  await prisma.doctorPatient.create({
    data: {
      doctorId: doctor.id,
      patientId: user.id
    }
  })

  revalidatePath('/dashboard/doctors')
}



async function removeDoctor(formData: FormData) {
  'use server'

  const session = await getValidatedSession()

  if (!session) {
    redirect('/?auth=required')
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId }
  })

  if (!user || user.role !== 'PATIENT') {
    redirect('/dashboard')
  }

  const doctorId = String(formData.get('doctorId') || '')

  if (!doctorId) return

  await prisma.doctorPatient.deleteMany({
    where: {
      doctorId,
      patientId: user.id
    }
  })

  revalidatePath('/dashboard/doctors')
}



export default async function DoctorsPage() {

  const session = await getValidatedSession()

  if (!session) {
    redirect('/?auth=required')
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId }
  })

  if (!user || user.role !== 'PATIENT') {
    redirect('/dashboard')
  }

  const doctors = await prisma.doctorPatient.findMany({
    where: {
      patientId: user.id
    },
    include: {
      doctor: true
    }
  })

  return (

    <div className="max-w-5xl mx-auto space-y-8">

      {/* Header */}

      <div className="bg-white rounded-xl p-6 shadow-sm border">

        <h1 className="text-2xl font-bold">
          Mis doctores
        </h1>

        <p className="text-gray-500 mt-2">
          Doctores que tienen acceso a tus documentos médicos
        </p>

      </div>


      {/* Agregar doctor */}

      <div className="bg-white rounded-xl p-6 shadow-sm border">

        <h2 className="font-semibold mb-4">
          Autorizar nuevo doctor
        </h2>

        <form action={addDoctor} className="flex gap-4">

          <input
            name="email"
            type="email"
            placeholder="Email del doctor"
            required
            className="border rounded-lg px-4 py-2 flex-1"
          />

          <button
            className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700"
          >
            Autorizar
          </button>

        </form>

      </div>


      {/* Lista de doctores */}

      <div className="bg-white rounded-xl p-6 shadow-sm border">

        <h2 className="font-semibold mb-6">
          Doctores autorizados
        </h2>

        {doctors.length === 0 && (

          <p className="text-gray-500">
            No has autorizado doctores todavía.
          </p>

        )}

        <div className="space-y-4">

          {doctors.map((d) => (

            <div
              key={d.id}
              className="border rounded-lg p-4 flex justify-between items-center"
            >

              <div>

                <p className="font-semibold">
                  {d.doctor.fullName}
                </p>

                <p className="text-sm text-gray-500">
                  {d.doctor.email}
                </p>

              </div>

              <form action={removeDoctor}>

                <input
                  type="hidden"
                  name="doctorId"
                  value={d.doctorId}
                />

                <button
                  className="bg-red-100 text-red-700 px-4 py-2 rounded-lg hover:bg-red-200"
                >
                  Revocar acceso
                </button>

              </form>

            </div>

          ))}

        </div>

      </div>

    </div>
  )
}