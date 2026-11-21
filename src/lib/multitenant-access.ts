import 'server-only'
import { prisma } from '@/lib/prisma'
import { getValidatedSession } from '@/lib/auth'
import type { MedicalGrantScope } from '@prisma/client'

/**
 * Multi-Tenant V1: deny by default.
 * The patient owns the longitudinal record; membership alone never grants access.
 * Do not activate in production routes until migration and integration tests pass.
 */
export class MedicalAccessDeniedError extends Error {
  constructor(public readonly reason: string) {
    super('MEDICAL_ACCESS_DENIED')
    this.name = 'MedicalAccessDeniedError'
  }
}

export type RecordOperation = 'READ_RECORD' | 'UPLOAD_DOCUMENT' | 'CATEGORIZE_DOCUMENT'
export type AccessDecision = {
  allowed: boolean
  reason: string
  actorId: string | null
  organizationId: string
  patientId: string
}

/** Always derive actorId from the validated session; never accept it from a request body. */
async function authorizeMedicalRecordAccess(args: {
  organizationId: string
  patientId: string
  operation: RecordOperation
  validatedActorId?: string
}): Promise<AccessDecision> {
  const { organizationId, patientId, operation } = args
  const session = await getValidatedSession()
  const actorId = args.validatedActorId ?? session?.userId ?? null
  const deny = (reason: string): AccessDecision => ({
    allowed: false, reason, actorId, organizationId, patientId,
  })

  if (!actorId || !organizationId || !patientId) return deny('INVALID_CONTEXT')
  const now = new Date()

  const actor = await prisma.user.findUnique({
    where: { id: actorId },
    select: { active: true, role: true },
  })
  if (!actor?.active || actor.role !== 'DOCTOR') return deny('INACTIVE_OR_NON_DOCTOR_ACTOR')

  // Self-service access is not scoped to a clinic, but this function requires
  // a clinic context for clinician operations. Patient access uses a separate path.
  const membership = await prisma.organizationMember.findUnique({
    where: { organizationId_userId: { organizationId, userId: actorId } },
    include: { organization: { select: { status: true } } },
  })
  if (
    !membership?.active ||
    membership.role !== 'DOCTOR' ||
    membership.organization.status !== 'ACTIVE'
  ) return deny('NO_ACTIVE_DOCTOR_MEMBERSHIP')

  const patient = await prisma.user.findUnique({
    where: { id: patientId },
    select: { active: true, role: true },
  })
  if (!patient?.active || patient.role !== 'PATIENT') return deny('INACTIVE_OR_NON_PATIENT_SUBJECT')

  // A revoked clinic association must also stop future clinical access.
  const patientAssociation = await prisma.patientOrganization.findUnique({
    where: {
      organizationId_patientId: { organizationId, patientId },
    },
    select: { active: true },
  })
  if (!patientAssociation?.active) return deny('NO_ACTIVE_PATIENT_ASSOCIATION')

  const allowedScopes: MedicalGrantScope[] = operation === 'UPLOAD_DOCUMENT'
    ? ['READ_AND_UPLOAD', 'READ_UPLOAD_CATEGORIZE']
    : ['READ_UPLOAD_CATEGORIZE']
  const grant = await prisma.medicalAccessGrant.findFirst({
    where: {
      organizationId,
      patientId,
      doctorId: actorId,
      status: 'ACTIVE',
      revokedAt: null,
      AND: [
        { OR: [{ validUntil: null }, { validUntil: { gt: now } }] },
        ...(operation === 'READ_RECORD' ? [] : [{ scope: { in: allowedScopes } }]),
      ],
    },
    select: { id: true },
  })

  if (!grant) {
    return deny('NO_VALID_PATIENT_GRANT')
  }
  return { allowed: true, reason: 'AUTHORIZED', actorId, organizationId, patientId }
}

/** Separate audit write to avoid hiding failed authorization behind an audit error. */
async function recordMedicalAccessDecision(
  decision: AccessDecision,
  action: RecordOperation,
  resourceId?: string,
): Promise<void> {
  if (!decision.actorId) return // No authenticated user to associate with the event.
  // Unknown or forged identifiers must not violate audit foreign keys.
  // Preserve the attempted context in the reason while keeping nullable FK fields valid.
  const [organization, patient] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: decision.organizationId },
      select: { id: true },
    }),
    prisma.user.findUnique({
      where: { id: decision.patientId },
      select: { id: true },
    }),
  ])
  await prisma.accessAuditEvent.create({
    data: {
      actorId: decision.actorId,
      organizationId: organization?.id ?? null,
      patientId: patient?.id ?? null,
      action,
      resourceType: 'MEDICAL_RECORD',
      resourceId,
      allowed: decision.allowed,
      reason: decision.reason,
    },
  })
}

/**
 * Preferred entry point for medical API routes.
 * Fail closed when the audit insert fails: no medical operation proceeds.
 * Callers MUST use this instead of authorizeMedicalRecordAccess directly.
 */
export async function requireAuditedMedicalRecordAccess(args: {
  organizationId: string
  patientId: string
  operation: RecordOperation
  resourceId?: string
}): Promise<AccessDecision> {
  const decision = await authorizeMedicalRecordAccess(args)
  // Audit must be persisted before returning an allow decision.
  // A database error rejects this call; callers must not continue on error.
  await recordMedicalAccessDecision(decision, args.operation, args.resourceId)
  if (!decision.allowed) throw new MedicalAccessDeniedError(decision.reason)
  return decision
}

/**
 * For legacy Pages API handlers only. Caller MUST validate pp_session against
 * prisma.session, expiry and passwordChangedAt before passing actorId.
 * The doctor is never selected from a request parameter.
 */
export async function requireAuditedMedicalRecordAccessForActor(args: {
  actorId: string
  organizationId: string
  patientId: string
  operation: RecordOperation
  resourceId?: string
}): Promise<AccessDecision> {
  const decision = await authorizeMedicalRecordAccess({
    organizationId: args.organizationId,
    patientId: args.patientId,
    operation: args.operation,
    validatedActorId: args.actorId,
  })
  await recordMedicalAccessDecision(decision, args.operation, args.resourceId)
  if (!decision.allowed) throw new MedicalAccessDeniedError(decision.reason)
  return decision
}

/** Finds a clinic context for a doctor; no consent is inferred from membership. */
export async function requireAuditedDoctorAccessForActor(args: {
  actorId: string
  patientId: string
  operation: RecordOperation
  resourceId?: string
}): Promise<AccessDecision> {
  const memberships = await prisma.organizationMember.findMany({
    where: { userId: args.actorId, role: 'DOCTOR', active: true, organization: { status: 'ACTIVE' } },
    select: { organizationId: true },
  })
  // Each possible clinic context must independently pass the patient grant check.
  for (const membership of memberships) {
    try {
      return await requireAuditedMedicalRecordAccessForActor({ ...args, organizationId: membership.organizationId })
    } catch (error) {
      if (!(error instanceof MedicalAccessDeniedError)) throw error
    }
  }
  throw new MedicalAccessDeniedError('NO_VALID_CLINIC_GRANT')
}
