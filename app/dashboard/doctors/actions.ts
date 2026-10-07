'use server'

import { prisma } from '@/lib/prisma'
import { getValidatedSession } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

// ==============================
// ❌ REVOCAR ACCESO
// ==============================
export async function revokeAccess(formData: FormData) {

  const session = await getValidatedSession()

  if (!session || !session.userId) {
    throw new Error("Unauthorized")
  }

  const actor = await prisma.user.findFirst({ where: { id: session.userId, active: true, role: 'PATIENT' }, select: { id: true } })
  if (!actor) throw new Error('Unauthorized')
  const doctorId = String(formData.get("doctorId") || '')

  if (!doctorId) {
    throw new Error("DoctorId missing")
  }

  const patientId = session.userId

  await prisma.$transaction(async tx => {
    await tx.doctorPatient.deleteMany({ where: { doctorId, patientId } })
    await tx.medicalAccessRequest.deleteMany({ where: { doctorId, patientId } })
    await tx.auditLog.create({ data: { userId: patientId, action: 'ACCESS_REVOKED', entityId: doctorId } })
  })

  revalidatePath('/dashboard/doctors')
}


// ==============================
// ➕ INVITAR DOCTOR
// ==============================
export async function inviteDoctor(formData: FormData) {

  const session = await getValidatedSession()

  if (!session || !session.userId) {
    throw new Error("Unauthorized")
  }

  const email = String(formData.get("email") || "")
    .toLowerCase()
    .trim()

  if (!email) {
    throw new Error("Email requerido")
  }

  const doctor = await prisma.user.findUnique({
    where: { email }
  })

  if (!doctor || !doctor.active || doctor.role !== "DOCTOR") {
    throw new Error("Doctor no encontrado")
  }

  const patientId = session.userId
  if (!await prisma.user.findFirst({ where: { id: patientId, active: true, role: 'PATIENT' }, select: { id: true } })) throw new Error('Unauthorized')

  // 🔒 Evita duplicados
  await prisma.medicalAccessRequest.upsert({
    where: {
      doctorId_patientId: {
        doctorId: doctor.id,
        patientId
      }
    },
    update: {},
    create: {
      doctorId: doctor.id,
      patientId,
      status: "PENDING"
    }
  })

  revalidatePath('/dashboard/doctors')
}