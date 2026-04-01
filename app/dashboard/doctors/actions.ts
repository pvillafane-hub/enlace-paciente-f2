'use server'

import { prisma } from '@/lib/prisma'
import { getValidatedSession } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

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