 'use server'
import { prisma } from '@/lib/prisma'
import { getValidatedSession } from '@/lib/auth'
import { requestPatientAccess } from '@/lib/consent'
import { revalidatePath } from 'next/cache'

export async function sendRequest(email: string) {
  const session = await getValidatedSession()
  if (!session || typeof email !== 'string') throw new Error('Unauthorized')
  const patient = await prisma.user.findFirst({ where: { email: email.trim().toLowerCase(), role: 'PATIENT', active: true }, select: { id: true } })
  if (!patient) throw new Error('Paciente no disponible')
  await requestPatientAccess(session.userId, patient.id)
  revalidatePath('/dashboard/requests')
}
