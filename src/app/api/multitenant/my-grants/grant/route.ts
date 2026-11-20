import { NextRequest, NextResponse } from 'next/server'
import { getValidatedSession } from '@/lib/auth'
import { grantDoctorAccess, ConsentError } from '@/lib/multitenant-consent'
import { Prisma, type MedicalGrantScope } from '@prisma/client'

export const dynamic = 'force-dynamic'
const scopes: MedicalGrantScope[] = ['READ_RECORD', 'READ_AND_UPLOAD', 'READ_UPLOAD_CATEGORIZE']

/** The patient is always identified by their session; never by request data. */
export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin')
  if (!origin || origin !== request.nextUrl.origin) {
    return NextResponse.json({ error: 'INVALID_ORIGIN' }, { status: 403 })
  }
  if (!(request.headers.get('content-type') ?? '').toLowerCase().startsWith('application/json')) {
    return NextResponse.json({ error: 'JSON_REQUIRED' }, { status: 415 })
  }
  const length = Number(request.headers.get('content-length') ?? 0)
  if (!Number.isFinite(length) || length > 4096) {
    return NextResponse.json({ error: 'PAYLOAD_TOO_LARGE' }, { status: 413 })
  }
  const session = await getValidatedSession()
  if (!session) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 })

  let payload: unknown
  try {
    const raw = await request.text()
    if (raw.length > 4096) return NextResponse.json({ error: 'PAYLOAD_TOO_LARGE' }, { status: 413 })
    payload = JSON.parse(raw)
  } catch {
    return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 })
  }

  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return NextResponse.json({ error: 'INVALID_PAYLOAD' }, { status: 400 })
  }
  const data = payload as Record<string, unknown>
  if (typeof data.doctorId !== 'string' || data.doctorId.length < 1 || data.doctorId.length > 128 ||
      typeof data.organizationId !== 'string' || data.organizationId.length < 1 || data.organizationId.length > 128 ||
      typeof data.scope !== 'string' || !scopes.includes(data.scope as MedicalGrantScope) ||
      (data.validUntil !== undefined && data.validUntil !== null && typeof data.validUntil !== 'string')) {
    return NextResponse.json({ error: 'INVALID_PAYLOAD' }, { status: 400 })
  }
  let validUntil: Date | null = null
  if (typeof data.validUntil === 'string') {
    if (data.validUntil.length > 40 || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(data.validUntil)) {
      return NextResponse.json({ error: 'INVALID_EXPIRATION' }, { status: 400 })
    }
    validUntil = new Date(data.validUntil)
    if (Number.isNaN(validUntil.getTime()) || validUntil.getTime() <= Date.now()) {
      return NextResponse.json({ error: 'INVALID_EXPIRATION' }, { status: 400 })
    }
  }

  try {
    const grant = await grantDoctorAccess({
      patientId: session.userId,
      doctorId: data.doctorId,
      organizationId: data.organizationId,
      scope: data.scope as MedicalGrantScope,
      validUntil,
    })
    return NextResponse.json({
      grant: {
        id: grant.id,
        organizationId: grant.organizationId,
        doctorId: grant.doctorId,
        scope: grant.scope,
        status: grant.status,
        validUntil: grant.validUntil,
      },
    }, { status: 201, headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    // Concurrent requests may race for the same unique active authorization.
    // Treat the database uniqueness guard as an existing permission, not a 500.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'ALREADY_GRANTED' }, { status: 409 })
    }
    if (error instanceof ConsentError) {
      const status = error.code === 'PATIENT_SESSION_REQUIRED' ? 401 :
        error.code === 'ALREADY_GRANTED' ? 409 : 403
      return NextResponse.json({ error: error.code }, { status })
    }
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
