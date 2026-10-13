import { prisma } from '@/lib/prisma'
import type { AlertSummary } from '@/lib/alert-summary'
export async function doctorAlertSummary(doctorId: string): Promise<AlertSummary> {
  const where = { doctorId, resolved: false, patient: { active: true, role: 'PATIENT' as const, patientDoctors: { some: { doctorId } } } }
  // A consistent snapshot keeps the badge and preview in agreement.
  return prisma.$transaction(async tx => {
    const total = await tx.medicalAlert.count({ where })
    const records = await tx.medicalAlert.findMany({ where, select: { id: true, type: true, patientId: true, createdAt: true, patient: { select: { fullName: true } } }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 5 })
    return { total, status: 'ready', alerts: records.map(a => ({ id: a.id, type: a.type, patientId: a.patientId, patientName: a.patient.fullName, createdAt: a.createdAt.toISOString() })) }
  }, { isolationLevel: 'RepeatableRead' })
}
