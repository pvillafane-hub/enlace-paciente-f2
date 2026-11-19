import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getValidatedSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * Lists only the authenticated patient's own doctor grants.
 * Never accepts patientId from query parameters or request body.
 * No medical records or doctor-to-patient access is exposed here.
 */
export async function GET() {
  try {
    const session = await getValidatedSession()
    if (!session) {
      return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 })
    }

    const patient = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { active: true, role: true },
    })
    if (!patient?.active || patient.role !== 'PATIENT') {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
    }

    const grants = await prisma.medicalAccessGrant.findMany({
      where: { patientId: session.userId },
      select: {
        id: true,
        status: true,
        scope: true,
        validUntil: true,
        revokedAt: true,
        createdAt: true,
        doctor: { select: { id: true, fullName: true } },
        organization: { select: { id: true, name: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Effective access also depends on current patient-clinic association.
    const associations = await prisma.patientOrganization.findMany({
      where: { patientId: session.userId, active: true },
      select: { organizationId: true },
    })
    const activeOrganizationIds = new Set(associations.map(a => a.organizationId))
    const memberships = await prisma.organizationMember.findMany({
      where: {
        organizationId: { in: [...activeOrganizationIds] },
        userId: { in: [...new Set(grants.map(g => g.doctor.id))] },
        role: 'DOCTOR',
        active: true,
        user: { active: true, role: 'DOCTOR' },
      },
      select: { organizationId: true, userId: true },
    })
    const activeDoctorContexts = new Set(
      memberships.map(m => JSON.stringify([m.organizationId, m.userId])),
    )
    const now = Date.now()
    const visibleGrants = grants.map(grant => ({
      ...grant,
      effective: grant.status === 'ACTIVE' &&
        grant.organization.status === 'ACTIVE' &&
        activeOrganizationIds.has(grant.organization.id) &&
        activeDoctorContexts.has(JSON.stringify([grant.organization.id, grant.doctor.id])) &&
        (!grant.validUntil || grant.validUntil.getTime() > now),
    }))

    return NextResponse.json(
      { grants: visibleGrants },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch {
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
