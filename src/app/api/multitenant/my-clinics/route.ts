import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getValidatedSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/** Lists only clinics where this patient has an active association.
 * An association is not consent to read medical records.
 */
export async function GET() {
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
    const associations = await prisma.patientOrganization.findMany({
      where: {
        patientId: session.userId,
        active: true,
        organization: { status: 'ACTIVE' },
      },
      select: { organization: { select: { id: true, name: true } } },
      take: 100,
    })
    return NextResponse.json(
      { organizations: associations.map(item => item.organization) },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch {
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
