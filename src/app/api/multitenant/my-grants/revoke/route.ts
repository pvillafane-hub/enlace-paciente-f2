import { NextRequest, NextResponse } from 'next/server'
import { getValidatedSession } from '@/lib/auth'
import { revokeDoctorAccess, ConsentError } from '@/lib/multitenant-consent'

export const dynamic = 'force-dynamic'

/**
 * Revoke a doctor's consent. Caller identity is always taken from the session.
 * A same-origin check provides an additional CSRF barrier for cookie authentication.
 */
export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin')
  if (!origin || origin !== request.nextUrl.origin) {
    return NextResponse.json({ error: 'INVALID_ORIGIN' }, { status: 403 })
  }
  const contentType = request.headers.get('content-type') ?? ''
  if (!contentType.toLowerCase().startsWith('application/json')) {
    return NextResponse.json({ error: 'JSON_REQUIRED' }, { status: 415 })
  }
  const length = Number(request.headers.get('content-length') ?? 0)
  if (!Number.isFinite(length) || length > 4096) {
    return NextResponse.json({ error: 'PAYLOAD_TOO_LARGE' }, { status: 413 })
  }

  const session = await getValidatedSession()
  if (!session) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 })
  }

  let payload: unknown
  try {
    const raw = await request.text()
    if (raw.length > 4096) {
      return NextResponse.json({ error: 'PAYLOAD_TOO_LARGE' }, { status: 413 })
    }
    payload = JSON.parse(raw)
  } catch {
    return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 })
  }
  if (
    !payload || typeof payload !== 'object' || Array.isArray(payload) ||
    !('grantId' in payload) || typeof payload.grantId !== 'string' ||
    payload.grantId.length < 1 || payload.grantId.length > 128
  ) {
    return NextResponse.json({ error: 'INVALID_GRANT_ID' }, { status: 400 })
  }

  try {
    const result = await revokeDoctorAccess({
      patientId: session.userId,
      grantId: payload.grantId,
    })
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    if (error instanceof ConsentError) {
      const status = error.code === 'PATIENT_SESSION_REQUIRED' ? 401 : 403
      return NextResponse.json({ error: 'CONSENT_NOT_AVAILABLE' }, { status })
    }
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
