import { prisma } from '@/lib/prisma'
import { getValidatedSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function PatientsPage() {

  const session = await getValidatedSession()

  if (!session) {
    redirect('/?auth=required')
  }

  const doctorId = session.userId

  const patients = await prisma.doctorPatient.findMany({
    where: {
      doctorId
    },
    include: {
      patient: true
    }
  })

  return (
    <div className="max-w-5xl mx-auto">

      <h1 className="text-3xl font-bold mb-8">
        Mis pacientes
      </h1>

      {patients.length === 0 && (
        <p className="text-gray-500 text-lg">
          No tienes pacientes todavía.
        </p>
      )}

      <div className="space-y-6">

        {patients.map((p) => (

          <Link
            key={p.id}
            href={`/dashboard/patient/${p.patient.id}`}
          >

            <div className="border rounded-xl p-6 bg-white shadow-sm hover:bg-gray-50 cursor-pointer transition">

              <h2 className="text-xl font-semibold">
                {p.patient.fullName}
              </h2>

              <p className="text-gray-500">
                {p.patient.email}
              </p>

            </div>

          </Link>

        ))}

      </div>

    </div>
  )
}