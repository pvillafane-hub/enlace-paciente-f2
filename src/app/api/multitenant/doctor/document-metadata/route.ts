import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getValidatedSession } from '@/lib/auth'
import { requireAuditedMedicalRecordAccess, MedicalAccessDeniedError } from '@/lib/multitenant-access'

export const dynamic = 'force-dynamic'

/**
 * Clinician-only document metadata. Never returns filePath or S3 credentials.
 * The organization context is supplied by the client but independently verified.
 * Document ownership is derived from the DB, not from a patientId parameter.
 */
export async function GET(request: NextRequest) {
  const organizationId = request.nextUrl.searchParams.get('organizationId')
  const documentId = request.nextUrl.searchParams.get('documentId')
  if (!organizationId || !documentId || organizationId.length > 128 || documentId.length > 128) {
    return NextResponse.json({ error: 'MISSING_PARAMETERS' }, { status: 400 })
  }
  try {
    // Authenticate before any document lookup, including metadata and ownership.
    const session = await getValidatedSession()
    if (!session) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 })
    const actor = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { active: true, role: true },
    })
    if (!actor?.active || actor.role !== 'DOCTOR') {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
    }

    const document = await prisma.document.findUnique({
      where: { id: documentId },
      select: {
        id: true, userId: true, filename: true, docType: true,
        facility: true, studyDate: true, createdAt: true,
        deletedAt: true, bodyPart: true, specialty: true,
      },
    })
    if (!document || document.deletedAt) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
    }

    await requireAuditedMedicalRecordAccess({
      organizationId,
      patientId: document.userId,
      operation: 'READ_RECORD',
      resourceId: document.id,
    })

    return NextResponse.json({
      document: {
        id: document.id,
        filename: document.filename,
        docType: document.docType,
        facility: document.facility,
        studyDate: document.studyDate,
        createdAt: document.createdAt,
        bodyPart: document.bodyPart,
        specialty: document.specialty,
      },
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    if (error instanceof MedicalAccessDeniedError) {
      // Do not disclose whether a patient's document exists to unauthorized callers.
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
    }
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
