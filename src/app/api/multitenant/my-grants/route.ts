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

    return NextResponse.json(
      { grants },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch {
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
