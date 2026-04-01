'use server'

import { prisma } from '@/lib/prisma'
import { getValidatedSession } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

// 🔥 REVOCAR ACCESO DE UN DOCTOR
export async function revokeAccess(doctorId: string) {

  const session = await getValidatedSession()

  if (!session) {
    throw new Error("Unauthorized")
  }

  // 🔥 FIX CRÍTICO (ESTO ELIMINA TODOS LOS ERRORES DE TYPESCRIPT)
  if (!session.userId) {
    throw new Error("Sesión inválida")
  }

  const patientId = session.userId

  // 🔐 BORRAR RELACIÓN DOCTOR-PACIENTE
  await prisma.doctorPatient.deleteMany({
    where: {
      doctorId,
      patientId
    }
  })

  // 🔐 BORRAR REQUESTS PENDIENTES/APROBADOS
  await prisma.medicalAccessRequest.deleteMany({
    where: {
      doctorId,
      patientId
    }
  })

  // 🔄 REFRESH UI
  revalidatePath('/dashboard/doctors')

  return { success: true }
}