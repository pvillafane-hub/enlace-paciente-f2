'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function resolveAlert(alertId: string) {

  await prisma.medicalAlert.update({
    where: { id: alertId },
    data: {
      resolved: true,
      resolvedAt: new Date()
    }
  })

  revalidatePath('/dashboard/alerts')
}