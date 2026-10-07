import { clinicDoctorId } from '@/lib/access'
import { prisma } from '@/lib/prisma'
import { getValidatedSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import PatientsSearch from './PatientsSearch'

export default async function PatientsPage() {

  const session = await getValidatedSession()

  if (!session?.userId) {
    redirect('/?auth=required')
  }

  const actor = await prisma.user.findUnique({ where: { id: session.userId } })
  const doctorId = actor ? await clinicDoctorId(actor) : null
  if (!doctorId) redirect('/dashboard')

  const patientsData = await prisma.doctorPatient.findMany({
    where: {
      doctorId,
      patient: { active: true, role: "PATIENT" }
    },
    include: {
      patient: {
        include: {
          documents: {
            where: { deletedAt: null },
            orderBy: {
              createdAt: 'desc'
            },
            take: 5
          }
        }
      }
    }
  })

  const patients = await Promise.all(
    patientsData.map(async (p) => {

      const docs = p.patient.documents

      const now = Date.now()
      const last7Days = now - 7 * 24 * 60 * 60 * 1000
      const last30Days = now - 30 * 24 * 60 * 60 * 1000

      const recent7 = docs.filter(d =>
        new Date(d.createdAt).getTime() > last7Days
      )

      const recent30 = docs.filter(d =>
        new Date(d.createdAt).getTime() > last30Days && new Date(d.createdAt).getTime() <= last7Days
      )

      // 🔥 SCORE
      let score = 0

      score += recent7.length * 25
      score += recent30.length * 10

      if (docs.length === 0) {
        score = 5
      }

      if (score > 100) score = 100

      // 🔥 NUEVO: clasificación clínica correcta
      const isHighNeed = score >= 70

      const lastDoc = docs[0]

      // 🔥 NUEVO: calcular días desde último doc
      let diffDays = null

      if (lastDoc) {
        diffDays = Math.floor(
          (now - new Date(lastDoc.createdAt).getTime()) /
          (1000 * 60 * 60 * 24)
        )
      }

      return {
        id: p.patient.id,
        fullName: p.patient.fullName,
        email: p.patient.email,

        // 👇 esto lo usará el frontend
        riskScore: score,
        isHighNeed,

        lastDoc: lastDoc
          ? {
              docType: lastDoc.docType,
              facility: lastDoc.facility,
              studyDate: lastDoc.studyDate,
              createdAt: lastDoc.createdAt.toISOString(),
              diffDays // 🔥 NUEVO
            }
          : null
      }
    })
  )

  return (

    <div className="max-w-5xl mx-auto">

      <h1 className="text-3xl font-bold mb-8">
        Mis pacientes
      </h1>

      <PatientsSearch patients={patients} />

    </div>

  )
}