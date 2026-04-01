'use server'

import { prisma } from '@/lib/prisma'
import { getValidatedSession } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function sendRequest(email: string) {

  const session = await getValidatedSession()

  // ✅ FIX CRÍTICO (server action)
  if (!session?.userId) {
    throw new Error("Unauthorized")
  }

  const doctorId = session.userId

  const patient = await prisma.user.findUnique({
    where: { email }
  })

  if (!patient) {
    throw new Error("Paciente no encontrado")
  }

  // 🔥 UPSERT (PRO)
  await prisma.medicalAccessRequest.upsert({
    where: {
      doctorId_patientId: {
        doctorId,
        patientId: patient.id
      }
    },
    update: {
      status: "PENDING"
    },
    create: {
      doctorId,
      patientId: patient.id
    }
  })

  revalidatePath('/dashboard/requests')
}