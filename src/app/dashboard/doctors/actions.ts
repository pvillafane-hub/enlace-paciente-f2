'use server'

import { prisma } from '@/lib/prisma'
import { getValidatedSession } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function revokeAccess(doctorId: string) {

  const session = await getValidatedSession()

  if (!session) {
    throw new Error("Unauthorized")
  }

  await prisma.doctorPatient.deleteMany({
    where: {
      doctorId,
      patientId: session.userId
    }
  })

  await prisma.medicalAccessRequest.deleteMany({
    where: {
      doctorId,
      patientId: session.userId
    }
  })

  revalidatePath('/dashboard/doctors')
}