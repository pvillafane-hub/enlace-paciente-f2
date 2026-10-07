import type { NextApiRequest, NextApiResponse } from 'next'
import { randomBytes, randomUUID } from 'node:crypto'
import { prisma } from '@/lib/prisma'
import { getApiSession } from '@/lib/api-auth'
import { clinicDoctorId } from '@/lib/access'
import { hashPassword } from '@/lib/auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  try {
    const session = await getApiSession(req.cookies.pp_session)
    if (!session) return res.status(401).json({ error: 'No autenticado' })
    const doctorId = await clinicDoctorId(session.user)
    if (!doctorId) return res.status(403).json({ error: 'No autorizado' })
    const { fullName, email } = req.body ?? {}
    if (typeof fullName !== 'string' || !fullName.trim() || fullName.length > 200) return res.status(400).json({ error: 'Nombre inválido' })
    const cleanEmail = typeof email === 'string' && email.trim() ? email.trim().toLowerCase() : null
    if (cleanEmail && (cleanEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail))) return res.status(400).json({ error: 'Email inválido' })
    const existing = cleanEmail ? await prisma.user.findUnique({ where: { email: cleanEmail }, select: { id: true, fullName: true, email: true, role: true, active: true } }) : null
    if (existing) {
      const relation = await prisma.doctorPatient.findUnique({ where: { doctorId_patientId: { doctorId, patientId: existing.id } } })
      if (existing.role !== 'PATIENT' || !existing.active || !relation) return res.status(403).json({ error: 'El paciente debe aprobar la solicitud de acceso' })
      // Never recreate a relationship for an existing account: revocation must remain effective.
      return res.status(200).json({ success: true, patient: { id: existing.id, fullName: existing.fullName, email: existing.email } })
    }
    const passwordHash = await hashPassword(randomBytes(32).toString('base64url'))
    const patient = await prisma.$transaction(async tx => {
      const user = await tx.user.create({ data: { fullName: fullName.trim(), email: cleanEmail || `patient-${randomUUID()}@enlacesalud.local`, passwordHash, role: 'PATIENT' }, select: { id: true, fullName: true, email: true } })
      await tx.doctorPatient.create({ data: { doctorId, patientId: user.id } })
      await tx.auditLog.create({ data: { userId: session.userId, action: 'PATIENT_CREATED', entityId: user.id } })
      return user
    })
    return res.status(201).json({ success: true, patient })
  } catch { console.error('PATIENT_CREATE_FAILED'); return res.status(409).json({ error: 'No se pudo crear; verifique la cuenta y solicite acceso si ya existe' }) }
}
