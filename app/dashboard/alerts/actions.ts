 'use server'
import { prisma } from '@/lib/prisma'
import { getValidatedSession } from '@/lib/auth'
import { clinicDoctorId } from '@/lib/access'
import { revalidatePath } from 'next/cache'

export async function resolveAlert(alertId: string) {
  const session = await getValidatedSession()
  if (!session) throw new Error('Unauthorized')
  const user = await prisma.user.findUnique({ where: { id: session.userId } })
  const doctorId = user ? await clinicDoctorId(user) : null
  if (!doctorId || typeof alertId !== 'string') throw new Error('Unauthorized')
  await prisma.$transaction(async tx => {
    const changed = await tx.medicalAlert.updateMany({ where: { id: alertId, doctorId, resolved: false, patient: { active: true, role: "PATIENT", patientDoctors: { some: { doctorId } } } }, data: { resolved: true, resolvedAt: new Date() } })
    if (changed.count !== 1) throw new Error('Alerta no disponible')
    await tx.auditLog.create({ data: { userId: session.userId, action: 'ALERT_RESOLVED', entityId: alertId } })
  })
  revalidatePath('/dashboard/alerts')
}
