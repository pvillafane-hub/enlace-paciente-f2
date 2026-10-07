import { getValidatedSession } from '@/lib/auth'
import { requestPatientAccess } from '@/lib/consent'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const session = await getValidatedSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { patientId } = await req.json()
  if (typeof patientId !== 'string' || !patientId) return NextResponse.json({ error: 'Invalid patientId' }, { status: 400 })
  try { await requestPatientAccess(session.userId, patientId); return NextResponse.json({ success: true }) }
  catch { return NextResponse.json({ error: 'No se puede solicitar acceso' }, { status: 403 }) }
}
