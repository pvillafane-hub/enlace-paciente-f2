'use server'

import { prisma } from '@/lib/prisma'
import { getValidatedSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Role, Prisma } from '@prisma/client'
import { revalidatePath } from 'next/cache'

async function requireAdmin() {
  const session = await getValidatedSession()
  if (!session?.userId) redirect('/?auth=required')
  const admin = await prisma.user.findUnique({ where: { id: session.userId } })
  if (!admin?.active || admin.role !== Role.ADMIN) throw new Error('Unauthorized')
  return admin
}

async function target(tx: Prisma.TransactionClient, userId: string) {
  const user = await tx.user.findUnique({ where: { id: userId } })
  if (!user || user.role === Role.ADMIN) throw new Error('Usuario no disponible para esta acción')
  const assignments = await tx.clinicStaff.findMany({
    where: { staffId: userId, active: true }, select: { doctorId: true }, orderBy: { doctorId: 'asc' },
  })
  return { user, doctorIds: assignments.map(a => a.doctorId) }
}

export async function toggleUserActive(userId: string, expectedActive: boolean) {
  const admin = await requireAdmin()
  await prisma.$transaction(async tx => {
    const { user } = await target(tx, userId)
    if (user.active !== expectedActive) throw new Error('El estado cambió. Actualice la página.')
    await tx.user.update({ where: { id: userId }, data: { active: !expectedActive } })
    const sessions = await tx.session.deleteMany({ where: { userId } })
    await tx.auditLog.create({ data: {
      userId: admin.id, action: 'USER_ACTIVE_CHANGED', entityId: userId,
      metadata: { version: 1, before: { active: user.active }, after: { active: !expectedActive }, revokedSessions: sessions.count },
    } })
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
  revalidatePath('/dashboard/admin/users')
}

export async function changeUserRole(userId: string, newRole: 'PATIENT' | 'DOCTOR') {
  const admin = await requireAdmin()
  if (newRole !== 'PATIENT' && newRole !== 'DOCTOR') throw new Error('Rol inválido')
  await prisma.$transaction(async tx => {
    const { user, doctorIds } = await target(tx, userId)
    if (user.role === newRole) return
    await tx.user.update({ where: { id: userId }, data: { role: newRole } })
    await tx.clinicStaff.updateMany({ where: { staffId: userId, active: true }, data: { active: false } })
    const sessions = await tx.session.deleteMany({ where: { userId } })
    await tx.auditLog.create({ data: {
      userId: admin.id, action: 'USER_ROLE_CHANGED', entityId: userId,
      metadata: { version: 1, before: { role: user.role, active: user.active, staffDoctorIds: doctorIds },
        after: { role: newRole, active: user.active, staffDoctorIds: [] }, revokedSessions: sessions.count },
    } })
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
  revalidatePath('/dashboard/admin/users')
}

export async function assignUserAsStaff(userId: string, formData: FormData) {
  const admin = await requireAdmin()
  const doctorId = formData.get('doctorId')
  if (typeof doctorId !== 'string' || !doctorId) throw new Error('Debe seleccionar un doctor')
  await prisma.$transaction(async tx => {
    const { user, doctorIds } = await target(tx, userId)
    const doctor = await tx.user.findUnique({ where: { id: doctorId } })
    if (!doctor?.active || doctor.role !== Role.DOCTOR || doctorId === userId) throw new Error('Doctor inválido o inactivo')
    if (user.role === Role.STAFF && user.active && doctorIds.length === 1 && doctorIds[0] === doctorId) return
    await tx.user.update({ where: { id: userId }, data: { role: Role.STAFF, active: true } })
    await tx.clinicStaff.updateMany({ where: { staffId: userId, active: true }, data: { active: false } })
    await tx.clinicStaff.upsert({
      where: { doctorId_staffId: { doctorId, staffId: userId } },
      update: { active: true, role: 'ASSISTANT' },
      create: { doctorId, staffId: userId, role: 'ASSISTANT', active: true },
    })
    const sessions = await tx.session.deleteMany({ where: { userId } })
    await tx.auditLog.create({ data: {
      userId: admin.id, action: 'USER_STAFF_ASSIGNED', entityId: userId,
      metadata: { version: 1, before: { role: user.role, active: user.active, staffDoctorIds: doctorIds },
        after: { role: Role.STAFF, active: true, staffDoctorIds: [doctorId] }, revokedSessions: sessions.count },
    } })
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
  revalidatePath('/dashboard/admin/users')
}
