import { prisma } from '@/lib/prisma'
import type { User } from '@prisma/client'

export async function clinicDoctorId(user: Pick<User, 'id' | 'role' | 'active'>) {
  if (!user.active) return null
  if (user.role === 'DOCTOR') return user.id
  if (user.role !== 'STAFF') return null
  const relation = await prisma.clinicStaff.findFirst({
    where: { staffId: user.id, active: true, doctor: { role: 'DOCTOR', active: true } },
    select: { doctorId: true },
  })
  return relation?.doctorId ?? null
}

export async function canReadPatient(user: Pick<User, 'id' | 'role' | 'active'>, patientId: string) {
  const patient = await prisma.user.findFirst({ where: { id: patientId, active: true, role: 'PATIENT' }, select: { id: true } })
  if (!patient || !user.active) return false
  if (user.id === patientId) return true
  const doctorId = await clinicDoctorId(user)
  if (!doctorId) return false
  return Boolean(await prisma.doctorPatient.findUnique({ where: { doctorId_patientId: { doctorId, patientId } } }))
}
