'use server'

import { prisma } from '@/lib/prisma'
import { getValidatedSession } from '@/lib/auth'
import { inviteDoctorAccess } from '@/lib/consent'
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

  revalidatePath('/dashboard', 'layout')
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
    where: { email }, select: { id: true, active: true, role: true }
  })

  if (!doctor || !doctor.active || doctor.role !== "DOCTOR") {
    throw new Error("Doctor no encontrado")
  }

  await inviteDoctorAccess(session.userId, doctor.id)
  revalidatePath('/dashboard', 'layout')
}

export async function inviteDoctorWithFeedback(_previous: { error: string; success: string }, formData: FormData) {
  try {
    await inviteDoctor(formData)
    return { error: '', success: 'Invitación registrada. Revisa el estado de solicitudes o los doctores con acceso debajo.' }
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    return { success: '', error: message === 'Doctor no encontrado' ? 'No encontramos un doctor activo con ese email.' : message === 'Unauthorized' || message === 'No autorizado' ? 'Necesitas una cuenta de paciente activa para enviar invitaciones.' : 'No se pudo enviar la invitación. Intenta nuevamente.' }
  }
}
