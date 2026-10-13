'use server'

import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireActiveAdmin } from '@/lib/admin-session'
import { LicenseInputError, parseLicenseForm, licenseRevision, licenseSnapshot, type LicenseActionState } from '@/lib/admin-license-policy'
import { revalidatePath } from 'next/cache'

function refreshLicenses() {
  for (const path of ['/dashboard/admin/licenses', '/dashboard/admin/logs', '/dashboard', '/dashboard/doctors']) revalidatePath(path)
}
function resultError(error: unknown): LicenseActionState {
  return { error: error instanceof LicenseInputError ? error.message : 'No se pudo guardar. Actualiza la página y verifica el estado antes de intentar nuevamente.' }
}

export async function addLicense(_state: LicenseActionState, data: FormData): Promise<LicenseActionState> {
  const admin = await requireActiveAdmin()
  try {
    const input = parseLicenseForm(data)
    const email = data.get('email')
    if (typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) throw new LicenseInputError('Escribe el correo de una cuenta existente.')
    await prisma.$transaction(async tx => {
      const user = await tx.user.findUnique({ where: { email: email.trim().toLowerCase() }, select: { id: true, role: true, active: true } })
      if (!user?.active || !['DOCTOR', 'PATIENT'].includes(user.role)) throw new LicenseInputError('La cuenta debe estar activa y tener rol Doctor o Paciente.')
      if (await tx.license.findFirst({ where: { userId: user.id }, select: { id: true } })) throw new LicenseInputError('Esta cuenta ya tiene una licencia. Búscala en la lista y utiliza Modificar.')
      const license = await tx.license.create({ data: { userId: user.id, role: user.role, status: input.status, plan: input.plan, validUntil: input.status === 'ACTIVE' ? input.validUntil : new Date(0) } })
      await tx.auditLog.create({ data: { userId: admin.id, entityId: license.id, action: 'ADMIN_LICENSE_CREATED', metadata: { source: 'manual', reason: input.reason, before: null, after: licenseSnapshot(license) } } })
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
    refreshLicenses()
    return { success: 'Licencia creada manualmente. No se ha registrado ni realizado un pago.' }
  } catch (error) { return resultError(error) }
}

export async function modifyLicense(id: string, expectedRevision: string, _state: LicenseActionState, data: FormData): Promise<LicenseActionState> {
  const admin = await requireActiveAdmin()
  try {
    const input = parseLicenseForm(data)
    await prisma.$transaction(async tx => {
      const previous = await tx.license.findUnique({ where: { id } })
      if (!previous || licenseRevision(previous) !== expectedRevision) throw new LicenseInputError('La licencia cambió. Actualiza la página antes de modificarla.')
      const user = await tx.user.findUnique({ where: { id: previous.userId }, select: { id: true, role: true, active: true } })
      if (!user) throw new LicenseInputError('Cuenta no disponible.')
      if (input.status === 'ACTIVE' && (!user.active || !['DOCTOR', 'PATIENT'].includes(user.role))) throw new LicenseInputError('Solo puedes activar una licencia de Doctor o Paciente con cuenta activa.')
      const replaced = await tx.license.findMany({ where: { userId: previous.userId, status: 'ACTIVE', id: { not: id } } })
      // Never let an older active license silently restore access after a manual change.
      for (const license of replaced) await tx.license.update({ where: { id: license.id }, data: { status: 'INACTIVE', validUntil: license.validUntil && license.validUntil < new Date() ? license.validUntil : new Date() } })
      const current = await tx.license.update({ where: { id }, data: { plan: input.plan, status: input.status, validUntil: input.status === 'ACTIVE' ? input.validUntil : previous.status === 'ACTIVE' ? previous.validUntil && previous.validUntil < new Date() ? previous.validUntil : new Date() : previous.validUntil && previous.validUntil < new Date() ? previous.validUntil : new Date(0), role: ['DOCTOR', 'PATIENT'].includes(user.role) ? user.role : previous.role } })
      await tx.auditLog.create({ data: { userId: admin.id, entityId: id, action: 'ADMIN_LICENSE_UPDATED', metadata: { source: 'manual', reason: input.reason, before: licenseSnapshot(previous), after: licenseSnapshot(current), deactivatedPreviousLicenses: replaced.map(licenseSnapshot) } } })
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
    refreshLicenses()
    return { success: 'Licencia modificada. El cambio manual quedó registrado en auditoría.' }
  } catch (error) { return resultError(error) }
}

export async function disableLicense(id: string, expectedRevision: string, _state: LicenseActionState, data: FormData): Promise<LicenseActionState> {
  const admin = await requireActiveAdmin()
  try {
    const reason = data.get('reason')
    if (typeof reason !== 'string' || reason.trim().length < 5 || reason.trim().length > 500) throw new LicenseInputError('Escribe un motivo de entre 5 y 500 caracteres.')
    await prisma.$transaction(async tx => {
      const previous = await tx.license.findUnique({ where: { id } })
      if (!previous || licenseRevision(previous) !== expectedRevision) throw new LicenseInputError('La licencia cambió. Actualiza la página antes de continuar.')
      const affected = await tx.license.findMany({ where: { userId: previous.userId, status: { not: 'INACTIVE' } } })
      if (!affected.length) return
      for (const license of affected) await tx.license.update({ where: { id: license.id }, data: { status: 'INACTIVE', validUntil: license.validUntil && license.validUntil < new Date() ? license.validUntil : new Date() } })
      await tx.auditLog.create({ data: { userId: admin.id, entityId: id, action: 'ADMIN_LICENSE_DISABLED', metadata: { source: 'manual', reason: reason.trim(), targetUserId: previous.userId, before: affected.map(licenseSnapshot), after: { status: 'INACTIVE' } } } })
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
    refreshLicenses()
    return { success: 'Licencias de la cuenta desactivadas. La cuenta y sus documentos se conservan.' }
  } catch (error) { return resultError(error) }
}
