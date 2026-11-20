import 'server-only'
import { prisma } from '@/lib/prisma'
import { getValidatedSession } from '@/lib/auth'
import type { MedicalGrantScope } from '@prisma/client'

/**
 * Patient-controlled authorization. This service must only be invoked server-side.
 * V1 supports consent by the patient personally; verified guardian workflows
 * require a separate explicit authorization path.
 */
export class ConsentError extends Error {
  constructor(public readonly code: string) {
    super(code)
    this.name = 'ConsentError'
  }
}

async function requireActivePatient(patientId: string): Promise<void> {
  const session = await getValidatedSession()
  if (!session || session.userId !== patientId) throw new ConsentError('PATIENT_SESSION_REQUIRED')
  const user = await prisma.user.findUnique({
    where: { id: patientId },
    select: { active: true, role: true },
  })
  if (!user?.active || user.role !== 'PATIENT') throw new ConsentError('PATIENT_ACCOUNT_REQUIRED')
}

export async function grantDoctorAccess(input: {
  patientId: string
  doctorId: string
  organizationId: string
  scope: MedicalGrantScope
  validUntil?: Date | null
}) {
  await requireActivePatient(input.patientId)
  const now = new Date()
  if (input.patientId === input.doctorId) throw new ConsentError('INVALID_DOCTOR')
  if (input.validUntil && (!Number.isFinite(input.validUntil.getTime()) || input.validUntil <= now)) {
    throw new ConsentError('INVALID_EXPIRATION')
  }
  if (!['READ_RECORD', 'READ_AND_UPLOAD', 'READ_UPLOAD_CATEGORIZE'].includes(input.scope)) {
    throw new ConsentError('INVALID_SCOPE')
  }

  return prisma.$transaction(async tx => {
    const membership = await tx.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: input.organizationId,
          userId: input.doctorId,
        },
      },
      include: {
        organization: { select: { status: true } },
        user: { select: { active: true, role: true } },
      },
    })
    if (!membership?.active || membership.role !== 'DOCTOR' ||
        membership.organization.status !== 'ACTIVE' ||
        !membership.user.active || membership.user.role !== 'DOCTOR') {
      throw new ConsentError('DOCTOR_NOT_ACTIVE_IN_ORGANIZATION')
    }

    // A clinic association is administrative, not consent. Require it before
    // allowing this patient to authorize a doctor in the clinic.
    const patientAssociation = await tx.patientOrganization.findUnique({
      where: {
        organizationId_patientId: {
          organizationId: input.organizationId,
          patientId: input.patientId,
        },
      },
      select: { active: true },
    })
    if (!patientAssociation?.active) {
      throw new ConsentError('PATIENT_NOT_ASSOCIATED_WITH_ORGANIZATION')
    }

    const existing = await tx.medicalAccessGrant.findFirst({
      where: {
        patientId: input.patientId,
        doctorId: input.doctorId,
        organizationId: input.organizationId,
        status: 'ACTIVE',
      },
    })
    if (existing) {
      // Expired-by-time grants remain ACTIVE in the database. Retire them
      // atomically so the partial unique index allows a fresh authorization.
      if (existing.revokedAt || !existing.validUntil || existing.validUntil > new Date()) {
        throw new ConsentError('ALREADY_GRANTED')
      }
      await tx.medicalAccessGrant.update({
        where: { id: existing.id },
        data: { status: 'EXPIRED' },
      })
      await tx.accessAuditEvent.create({
        data: {
          organizationId: input.organizationId,
          actorId: input.patientId,
          patientId: input.patientId,
          action: 'EXPIRE_DOCTOR_ACCESS',
          resourceType: 'MEDICAL_ACCESS_GRANT',
          resourceId: existing.id,
          allowed: true,
        },
      })
    }

    const grant = await tx.medicalAccessGrant.create({
      data: {
        patientId: input.patientId,
        doctorId: input.doctorId,
        organizationId: input.organizationId,
        grantedById: input.patientId,
        scope: input.scope,
        validUntil: input.validUntil ?? null,
      },
    })
    await tx.accessAuditEvent.create({
      data: {
        organizationId: input.organizationId,
        actorId: input.patientId,
        patientId: input.patientId,
        action: 'GRANT_DOCTOR_ACCESS',
        resourceType: 'MEDICAL_ACCESS_GRANT',
        resourceId: grant.id,
        allowed: true,
      },
    })
    return grant
  })
}

export async function revokeDoctorAccess(input: {
  patientId: string
  grantId: string
}) {
  await requireActivePatient(input.patientId)
  return prisma.$transaction(async tx => {
    const grant = await tx.medicalAccessGrant.findUnique({
      where: { id: input.grantId },
    })
    if (!grant || grant.patientId !== input.patientId || grant.status !== 'ACTIVE') {
      throw new ConsentError('ACTIVE_GRANT_NOT_FOUND')
    }

    const result = await tx.medicalAccessGrant.updateMany({
      where: { id: grant.id, patientId: input.patientId, status: 'ACTIVE' },
      data: { status: 'REVOKED', revokedAt: new Date() },
    })
    if (result.count !== 1) throw new ConsentError('GRANT_CHANGED')

    await tx.accessAuditEvent.create({
      data: {
        organizationId: grant.organizationId,
        actorId: input.patientId,
        patientId: input.patientId,
        action: 'REVOKE_DOCTOR_ACCESS',
        resourceType: 'MEDICAL_ACCESS_GRANT',
        resourceId: grant.id,
        allowed: true,
      },
    })
    return { revoked: true, grantId: grant.id }
  })
}
