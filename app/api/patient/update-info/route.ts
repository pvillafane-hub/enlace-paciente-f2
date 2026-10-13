import { getLicenseAccess } from '@/lib/license-access'
import { parsePatientProfile, ProfileInputError } from '@/lib/patient-profile-policy'
import { prisma } from '@/lib/prisma'
import { getValidatedSession } from '@/lib/auth'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const session = await getValidatedSession()
    if (!session?.userId) return NextResponse.json({ error: 'Tu sesión terminó. Vuelve a iniciar sesión para guardar.' }, { status: 401 })
    const userId = session.userId
    const actor = await prisma.user.findFirst({ where: { id: userId, role: 'PATIENT', active: true }, select: { id: true } })
    if (!actor) return NextResponse.json({ error: 'Solo una cuenta de paciente activa puede modificar su información.' }, { status: 403 })
    if (!(await getLicenseAccess(userId)).active) return NextResponse.json({ error: 'Necesitas una licencia activa para modificar tu información. Los datos escritos se conservan en esta pantalla.' }, { status: 403 })
    let body: unknown
    try { body = await req.json() } catch { return NextResponse.json({ error: 'No se pudo leer el formulario. Intenta nuevamente.' }, { status: 400 }) }
    const data = parsePatientProfile(body)
    await prisma.$transaction(async tx => {
      await tx.user.update({ where: { id: userId }, data })
      await tx.auditLog.create({ data: { userId, action: 'PATIENT_PROFILE_UPDATED', metadata: { fields: ['dateOfBirth', 'bloodType', 'allergies'], source: 'patient_self_reported' } } })
    })
    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof ProfileInputError) return NextResponse.json({ error: error.message }, { status: 400 })
    console.error('PATIENT_PROFILE_UPDATE_FAILED')
    return NextResponse.json({ error: 'No se pudo guardar. Tu información escrita sigue en la pantalla; intenta nuevamente.' }, { status: 500 })
  }
}
