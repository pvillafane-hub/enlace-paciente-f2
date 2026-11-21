import { getValidatedSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'

export async function requireActiveAdmin(redirectUnauthorized = false) {
  const session = await getValidatedSession()
  if (!session) redirect('/?auth=required')
  const admin = await prisma.user.findUnique({ where: { id: session.userId }, select: { id: true, role: true, active: true } })
  if (!admin?.active || admin.role !== 'ADMIN') {
    if (redirectUnauthorized) redirect('/dashboard')
    throw new Error('Unauthorized')
  }
  return admin
}
