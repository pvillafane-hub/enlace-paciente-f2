import { getLicenseAccess } from '@/lib/license-access'
import { clinicDoctorId } from '@/lib/access'
import { doctorAlertSummary } from '@/lib/doctor-alert-summary'
import { prisma } from '@/lib/prisma'
import { getValidatedSession } from '@/lib/auth'
import { NextResponse } from 'next/server'
const headers = { 'Cache-Control': 'private, no-store' }
export async function GET() {
  try {
    const session = await getValidatedSession()
    if (!session?.userId) return NextResponse.json({ error: 'Sesión finalizada' }, { status: 401, headers })
    const actor = await prisma.user.findUnique({ where: { id: session.userId } })
    const doctorId = actor ? await clinicDoctorId(actor) : null
    if (!doctorId) return NextResponse.json({ error: 'Acceso no disponible' }, { status: 403, headers })
    if (!(await getLicenseAccess(session.userId)).active) return NextResponse.json({ status: 'license-required', alerts: [], total: 0 }, { headers })
    return NextResponse.json(await doctorAlertSummary(doctorId), { headers })
  } catch {
    console.error('ALERT_SUMMARY_FAILED')
    return NextResponse.json({ error: 'No se pudieron actualizar las alertas' }, { status: 503, headers })
  }
}
