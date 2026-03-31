import { prisma } from '@/lib/prisma'
import { getValidatedSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import PatientsSearch from './PatientsSearch'

export default async function PatientsPage() {

  const session = await getValidatedSession()

  if (!session) {
    redirect('/?auth=required')
  }

  const doctorId = session.userId

  const patientsData = await prisma.doctorPatient.findMany({
    where: {
      doctorId
    },
    include: {
      patient: {
        include: {
          documents: {
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
        new Date(d.createdAt).getTime() > last30Days
      )

      // 🔥 SCORE
      let score = 0

      score += recent7.length * 25
      score += recent30.length * 10

      if (docs.length === 0) {
        score = 5
      }

      if (score > 100) score = 100

      // 🚨 ALERTA AUTOMÁTICA (SIN DUPLICADOS)
      if (score >= 80) {

        const existingAlert = await prisma.auditLog.findFirst({
          where: {
            action: "HIGH_RISK_PATIENT",
            userId: p.patient.id,
            createdAt: {
              gte: new Date(Date.now() - 60 * 60 * 1000) // 1 hora
            }
          }
        })

        if (!existingAlert) {
          await prisma.auditLog.create({
            data: {
              action: "HIGH_RISK_PATIENT",
              userId: p.patient.id,
              metadata: {
                score,
                reason: "High activity in short period"
              }
            }
          })
        }
      }

      const lastDoc = docs[0]

      return {
        id: p.patient.id,
        fullName: p.patient.fullName,
        email: p.patient.email,
        riskScore: score,
        lastDoc: lastDoc
          ? {
              docType: lastDoc.docType,
              facility: lastDoc.facility,
              studyDate: lastDoc.studyDate,
              createdAt: lastDoc.createdAt.toISOString()
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