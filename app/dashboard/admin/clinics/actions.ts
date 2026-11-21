'use server'

import { prisma } from '@/lib/prisma'
import { getValidatedSession } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { OrganizationMemberRole, OrganizationStatus } from '@prisma/client'

async function requireAdmin() {
  const session = await getValidatedSession()
  if (!session?.userId) throw new Error('Sesión requerida')
  const actor = await prisma.user.findUnique({ where: { id: session.userId }, select: { role: true, active: true } })
  if (!actor?.active || actor.role !== 'ADMIN') throw new Error('Acceso restringido a administradores')
  return session.userId
}
function value(data: FormData, name: string, max = 160) {
  const raw = data.get(name)
  if (typeof raw !== 'string') return ''
  return raw.trim().slice(0, max)
}
function refresh() { revalidatePath('/dashboard/admin/clinics'); revalidatePath('/dashboard/multitenant/mis-medicos') }
async function audit(actorId: string, organizationId: string, action: string, resourceId?: string) {
  await prisma.accessAuditEvent.create({ data: { actorId, organizationId, action, resourceType: 'CLINIC_ONBOARDING', resourceId, allowed: true } })
}
export async function createClinic(data: FormData) {
  const actorId = await requireAdmin()
  const name = value(data, 'name')
  const slug = value(data, 'slug', 80).toLowerCase()
  if (name.length < 3 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error('Nombre o identificador de clínica inválido')
  const clinic = await prisma.$transaction(async tx => {
    const created = await tx.organization.create({ data: {
      name, slug, status: 'INACTIVE', address: value(data,'address') || null, city: value(data,'city') || null,
      phone: value(data,'phone') || null, email: value(data,'email') || null,
      contactName: value(data,'contactName') || null, plan: value(data,'plan') || null,
    } })
    await tx.accessAuditEvent.create({ data: { actorId, organizationId: created.id, action: 'ONBOARD_CLINIC_CREATE', resourceType: 'CLINIC_ONBOARDING', resourceId: created.id, allowed: true } })
    return created
  })
  refresh()
  return clinic.id
}
export async function updateClinic(data: FormData) {
  const actorId = await requireAdmin()
  const id = value(data,'organizationId',80)
  const name = value(data,'name')
  if (!id || name.length < 3) throw new Error('Datos de clínica inválidos')
  await prisma.$transaction(async tx => {
    await tx.organization.update({ where: { id }, data: {
      name, address: value(data,'address') || null, city: value(data,'city') || null,
      phone: value(data,'phone') || null, email: value(data,'email') || null,
      contactName: value(data,'contactName') || null, plan: value(data,'plan') || null,
    } })
    await tx.accessAuditEvent.create({ data: { actorId, organizationId: id, action: 'ONBOARD_CLINIC_UPDATE', resourceType: 'CLINIC_ONBOARDING', resourceId: id, allowed: true } })
  })
  refresh()
}
export async function setClinicStatus(data: FormData) {
  const actorId = await requireAdmin()
  const id = value(data,'organizationId',80)
  const status = value(data,'status') as OrganizationStatus
  if (!id || !['ACTIVE','SUSPENDED','INACTIVE'].includes(status)) throw new Error('Estado inválido')
  await prisma.$transaction(async tx => {
    const clinic = await tx.organization.findUniqueOrThrow({ where: { id }, select: { activatedAt: true } })
    await tx.organization.update({ where: { id }, data: { status, ...(status === 'ACTIVE' && !clinic.activatedAt ? { activatedAt: new Date() } : {}) } })
    await tx.accessAuditEvent.create({ data: { actorId, organizationId: id, action: 'ONBOARD_CLINIC_STATUS_'+status, resourceType: 'CLINIC_ONBOARDING', resourceId: id, allowed: true } })
  })
  refresh()
}
export async function associateUser(data: FormData) {
  const actorId = await requireAdmin()
  const organizationId = value(data,'organizationId',80)
  const email = value(data,'email',254).toLowerCase()
  const kind = value(data,'kind')
  if (!organizationId || !email || !['DOCTOR','PATIENT','NURSE','STAFF','ADMIN'].includes(kind)) throw new Error('Asociación inválida')
  await prisma.$transaction(async tx => {
    await tx.organization.findUniqueOrThrow({ where: { id: organizationId } })
    const user = await tx.user.findUnique({ where: { email }, select: { id: true, role: true, active: true } })
    if (!user?.active) throw new Error('La cuenta debe existir y estar activa')
    if (kind === 'PATIENT') {
      if (user.role !== 'PATIENT') throw new Error('La cuenta no tiene rol PACIENTE')
      await tx.patientOrganization.upsert({ where: { organizationId_patientId: { organizationId, patientId: user.id } }, create: { organizationId, patientId: user.id }, update: { active: true } })
    } else {
      if (kind === 'DOCTOR' && user.role !== 'DOCTOR') throw new Error('La cuenta no tiene rol DOCTOR')
      if (['NURSE','STAFF'].includes(kind) && user.role !== 'STAFF') throw new Error('La cuenta debe tener rol STAFF')
      if (kind === 'ADMIN' && user.role !== 'ADMIN') throw new Error('La cuenta debe tener rol ADMIN')
      await tx.organizationMember.upsert({ where: { organizationId_userId: { organizationId, userId: user.id } }, create: { organizationId, userId: user.id, role: kind as OrganizationMemberRole }, update: { role: kind as OrganizationMemberRole, active: true } })
    }
    await tx.accessAuditEvent.create({ data: { actorId, organizationId, patientId: kind === 'PATIENT' ? user.id : null, action: 'ONBOARD_ASSOCIATE_'+kind, resourceType: 'USER', resourceId: user.id, allowed: true } })
  })
  refresh()
}
export async function removeAssociation(data: FormData) {
  const actorId = await requireAdmin()
  const organizationId = value(data,'organizationId',80)
  const userId = value(data,'userId',80)
  const kind = value(data,'kind')
  if (!organizationId || !userId || !['PATIENT','MEMBER'].includes(kind)) throw new Error('Asociación inválida')
  await prisma.$transaction(async tx => {
    if (kind === 'PATIENT') await tx.patientOrganization.updateMany({ where: { organizationId, patientId: userId }, data: { active: false } })
    else await tx.organizationMember.updateMany({ where: { organizationId, userId }, data: { active: false } })
    await tx.accessAuditEvent.create({ data: { actorId, organizationId, patientId: kind === 'PATIENT' ? userId : null, action: 'ONBOARD_DISASSOCIATE_'+kind, resourceType: 'USER', resourceId: userId, allowed: true } })
  })
  refresh()
}
