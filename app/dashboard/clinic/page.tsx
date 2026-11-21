import { prisma } from '@/lib/prisma'
import { getValidatedSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { requireAuditedDoctorAccessForActor, MedicalAccessDeniedError } from '@/lib/multitenant-access'

export default async function ClinicPage() {

  const session = await getValidatedSession()

  if (!session) {
    redirect('/?auth=required')
  }

  // 🔥 FIX CRÍTICO FINAL
  if (!session.userId) {
    redirect('/?auth=required')
  }

  const doctorId = session.userId
  const actor = await prisma.user.findUnique({ where: { id: doctorId }, select: { active: true, role: true } })
  if (!actor?.active || actor.role !== 'DOCTOR') redirect('/dashboard')

  const legacyPatients = await prisma.doctorPatient.findMany({
    where: { doctorId },
    include: {
      patient: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  })

  const patients = (await Promise.all(legacyPatients.map(async p => {
    try {
      await requireAuditedDoctorAccessForActor({ actorId: doctorId, patientId: p.patientId, operation: 'READ_RECORD' })
      return p
    } catch (error) {
      if (error instanceof MedicalAccessDeniedError) return null
      throw error
    }
  }))).filter((p): p is NonNullable<typeof p> => p !== null)

  return (

    <div className="flex h-[calc(100vh-120px)] border rounded-xl overflow-hidden bg-white">

      {/* SIDEBAR PACIENTES */}

      <div className="w-72 border-r bg-gray-50 overflow-y-auto">

        <div className="p-4 border-b font-semibold">
          Pacientes
        </div>

        <div className="divide-y">

          {patients.map((p) => (

            <Link
              key={p.id}
              href={`/dashboard/patients/${p.patient.id}`}
              className="block p-4 hover:bg-gray-100"
            >

              <p className="font-semibold">
                {p.patient.fullName}
              </p>

              <p className="text-sm text-gray-500">
                {p.patient.email}
              </p>

            </Link>

          ))}

        </div>

      </div>


      {/* PANEL DERECHO */}

      <div className="flex-1 flex items-center justify-center text-gray-400">

        <div className="text-center">

          <p className="text-xl">
            Selecciona un paciente
          </p>

          <p className="text-sm mt-2">
            para ver su expediente médico
          </p>

        </div>

      </div>

    </div>

  )
}