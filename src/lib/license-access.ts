import { prisma } from '@/lib/prisma'
import { clinicDoctorId } from '@/lib/access'
import { licenseAccess } from '@/lib/license-policy'

// Staff uses its active clinic doctor's entitlement, never a separate free bypass.
export async function getLicenseAccess(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user?.active) return licenseAccess([])
  const ownerId = user.role === 'STAFF' ? await clinicDoctorId(user) : user.id
  if (!ownerId || !['PATIENT', 'DOCTOR', 'STAFF'].includes(user.role)) return licenseAccess([])
  const role = user.role === 'STAFF' ? 'DOCTOR' : user.role
  const licenses = await prisma.license.findMany({ where: { userId: ownerId, role }, orderBy: { createdAt: 'desc' } })
  return licenseAccess(licenses)
}
