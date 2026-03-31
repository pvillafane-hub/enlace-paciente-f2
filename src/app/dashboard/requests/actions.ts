'use server'

import { prisma } from '@/lib/prisma'
import { getValidatedSession } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function sendRequest(email: string) {

  const session = await getValidatedSession()

  if (!session) {
    throw new Error("Unauthorized")
  }

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
        doctorId: session.userId,
        patientId: patient.id
      }
    },
    update: {
      status: "PENDING"
    },
    create: {
      doctorId: session.userId,
      patientId: patient.id
    }
  })

  revalidatePath('/dashboard/requests')
}