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

  const doctorId = String(formData.get("doctorId"))

  if (!doctorId) {
    throw new Error("DoctorId missing")
  }

  const patientId = session.userId

  await prisma.doctorPatient.deleteMany({
    where: {
      doctorId,
      patientId
    }
  })

  await prisma.medicalAccessRequest.deleteMany({
    where: {
      doctorId,
      patientId
    }
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

  if (!doctor || doctor.role !== "DOCTOR") {
    throw new Error("Doctor no encontrado")
  }

  const patientId = session.userId

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