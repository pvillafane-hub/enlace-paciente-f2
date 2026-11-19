import { NextRequest, NextResponse } from 'next/server'
import { getValidatedSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * Patient-only doctor directory scoped to an active clinic.
 * The returned membership is not a medical-record authorization.
 */
export async function GET(request: NextRequest) {
  const organizationId = request.nextUrl.searchParams.get('organizationId')
  if (!organizationId || organizationId.length > 128) {
    return NextResponse.json({ error: 'INVALID_ORGANIZATION' }, { status: 400 })
  }
  try {
    const session = await getValidatedSession()
    if (!session) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 })

    const patient = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { active: true, role: true },
    })
    if (!patient?.active || patient.role !== 'PATIENT') {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
    }

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, name: true, status: true },
    })
    if (!organization || organization.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
    }

    const members = await prisma.organizationMember.findMany({
      where: {
        organizationId,
        role: 'DOCTOR',
        active: true,
        user: { active: true, role: 'DOCTOR' },
      },
      select: { user: { select: { id: true, fullName: true } } },
      orderBy: { user: { fullName: 'asc' } },
      take: 100,
    })
    return NextResponse.json({
      organization: { id: organization.id, name: organization.name },
      doctors: members.map(member => member.user),
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
