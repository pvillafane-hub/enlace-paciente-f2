import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getValidatedSession } from '@/lib/auth'
import { requireAuditedDoctorAccessForActor, MedicalAccessDeniedError } from '@/lib/multitenant-access'

export const dynamic = 'force-dynamic'

const CATEGORIES = ['Laboratorio', 'Radiografía', 'Resonancia magnética', 'Tomografía', 'Ultrasonido', 'Mamografía', 'Electrocardiograma', 'Receta', 'Medicamentos', 'Informe médico', 'Patología', 'Vacunas', 'Otros']

export async function POST(request: Request) {
  try {
    const session = await getValidatedSession()
    if (!session?.userId) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 })
    const body = await request.json()
    const documentId = body?.documentId
    const category = body?.category
    if (typeof documentId !== 'string' || documentId.length > 128 || typeof category !== 'string' || !CATEGORIES.includes(category)) {
      return NextResponse.json({ error: 'INVALID_PARAMETERS' }, { status: 400 })
    }
    const doc = await prisma.document.findFirst({ where: { id: documentId, deletedAt: null }, select: { id: true, userId: true, docType: true } })
    if (!doc) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
    await requireAuditedDoctorAccessForActor({ actorId: session.userId, patientId: doc.userId, operation: 'CATEGORIZE_DOCUMENT', resourceId: doc.id })
    if (doc.docType === category) return NextResponse.json({ ok: true, category })
    const updated = await prisma.$transaction(async tx => {
      const result = await tx.document.updateMany({ where: { id: doc.id, userId: doc.userId, deletedAt: null, docType: doc.docType }, data: { docType: category } })
      if (result.count !== 1) return false
      await tx.auditLog.create({ data: { userId: session.userId!, action: 'DOCTOR_DOCUMENT_CATEGORY_CHANGED', entityId: doc.id, metadata: { patientId: doc.userId, previousCategory: doc.docType, newCategory: category } } })
      return true
    })
    if (!updated) return NextResponse.json({ error: 'CONFLICT_RELOAD' }, { status: 409 })
    return NextResponse.json({ ok: true, category }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    if (error instanceof MedicalAccessDeniedError) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
