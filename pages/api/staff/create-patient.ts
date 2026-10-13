import { getLicenseAccess } from '@/lib/license-access'
import type { NextApiRequest, NextApiResponse } from 'next'
import { randomBytes, randomUUID } from 'node:crypto'
import { prisma } from '@/lib/prisma'
import { getApiSession } from '@/lib/api-auth'
import { clinicDoctorId } from '@/lib/access'
import { hashPassword } from '@/lib/auth'
import { validDateOnly } from '@/lib/file-policy'

const patientSelect = { id: true, fullName: true, dateOfBirth: true } as const
class RegistrationError extends Error {}
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  res.setHeader('Cache-Control', 'private, no-store')
  try {
    const session = await getApiSession(req.cookies.pp_session)
    if (!session) return res.status(401).json({ error: 'No autenticado' })
    if (!(await getLicenseAccess(session.userId)).active) return res.status(403).json({ error: 'Necesitas una licencia activa para esta acción', code: 'LICENSE_REQUIRED' })
    const doctorId = await clinicDoctorId(session.user)
    if (!doctorId) return res.status(403).json({ error: 'No autorizado' })
    const { fullName, email, dateOfBirth, authorizationConfirmed, intent } = req.body ?? {}
    const name = typeof fullName === 'string' ? fullName.trim().replace(/\s+/g, ' ') : ''
    if (name.length < 2 || name.length > 200) return res.status(400).json({ error: 'Escribe el nombre completo del paciente.' })
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Puerto_Rico', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
    const validBirth = validDateOnly(dateOfBirth) && dateOfBirth <= today && dateOfBirth >= '1850-01-01'
    if (intent === 'search') {
      if (dateOfBirth && !validBirth) return res.status(400).json({ error: 'Verifica la fecha de nacimiento.' })
      // Only search already authorized patients of this clinic; never expose other clinics' records.
      const patients = await prisma.user.findMany({
        where: { role: 'PATIENT', active: true, fullName: { contains: name, mode: 'insensitive' }, ...(validBirth ? { dateOfBirth: new Date(dateOfBirth) } : {}), patientDoctors: { some: { doctorId } } },
        select: patientSelect, orderBy: [{ fullName: 'asc' }, { id: 'asc' }], take: 6,
      })
      await prisma.auditLog.create({ data: { userId: session.userId, action: 'PATIENT_ASSISTED_SEARCH', metadata: { doctorId, resultCount: patients.length } } })
      return res.status(200).json({ patients: patients.slice(0, 5), hasMore: patients.length > 5 })
    }
    if (intent && intent !== 'register') return res.status(400).json({ error: 'Acción inválida.' })
    if (!validBirth) return res.status(400).json({ error: 'Indica una fecha de nacimiento válida, sin fechas futuras.' })
    if (authorizationConfirmed !== true) return res.status(400).json({ error: 'Confirma que el paciente autorizó el registro y el acceso de este doctor.' })
    if (email !== undefined && typeof email !== 'string') return res.status(400).json({ error: 'Verifica el correo electrónico.' })
    const cleanEmail = typeof email === 'string' && email.trim() ? email.trim().toLowerCase() : null
    if (cleanEmail && (cleanEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail))) return res.status(400).json({ error: 'Verifica el correo electrónico o déjalo vacío.' })
    const existing = cleanEmail ? await prisma.user.findUnique({ where: { email: cleanEmail }, select: { ...patientSelect, role: true, active: true } }) : null
    if (existing) {
      const relation = await prisma.doctorPatient.findUnique({ where: { doctorId_patientId: { doctorId, patientId: existing.id } } })
      if (existing.role !== 'PATIENT' || !existing.active || !relation) return res.status(403).json({ error: 'No puedes registrar otra cuenta con ese correo. El doctor debe solicitar acceso y el paciente aprobarlo; si necesita ayuda, acompáñalo desde su cuenta.', code: 'CONSENT_REQUIRED' })
      if (existing.dateOfBirth && existing.dateOfBirth.toISOString().slice(0, 10) !== dateOfBirth) return res.status(409).json({ error: 'La fecha de nacimiento no coincide con el expediente autorizado. Verifica la identidad antes de continuar.' })
      return res.status(200).json({ success: true, existing: true, patient: { id: existing.id, fullName: existing.fullName, dateOfBirth: existing.dateOfBirth } })
    }
    const passwordHash = await hashPassword(randomBytes(32).toString('base64url'))
    const result = await prisma.$transaction(async tx => {
      // Serializable lookup also prevents repeated submissions from creating duplicate clinic records.
      const duplicate = await tx.user.findFirst({ where: { role: 'PATIENT', active: true, fullName: { equals: name, mode: 'insensitive' }, dateOfBirth: new Date(dateOfBirth), patientDoctors: { some: { doctorId } } }, select: patientSelect })
      if (duplicate) return { patient: duplicate, existing: true }
      // Recheck the optional email inside the transaction, so a concurrent registration never grants access to an existing account.
      if (cleanEmail && await tx.user.findUnique({ where: { email: cleanEmail }, select: { id: true } })) throw new RegistrationError('El correo ya está registrado. Busca el expediente o solicita acceso desde la cuenta del doctor.')
      const user = await tx.user.create({ data: { fullName: name, dateOfBirth: new Date(dateOfBirth), email: cleanEmail || `patient-${randomUUID()}@enlacesalud.local`, passwordHash, role: 'PATIENT' }, select: patientSelect })
      await tx.doctorPatient.create({ data: { doctorId, patientId: user.id } })
      await tx.auditLog.create({ data: { userId: session.userId, action: 'PATIENT_CREATED', entityId: user.id, metadata: { source: 'assisted_registration', doctorId, actorRole: session.user.role, authorization: { confirmed: true, method: 'staff_or_doctor_attestation', recordedAt: new Date().toISOString() }, personalAccessActivated: false } } })
      return { patient: user, existing: false }
    }, { isolationLevel: 'Serializable' })
    return res.status(result.existing ? 200 : 201).json({ success: true, ...result })
  } catch (error) {
    console.error('PATIENT_CREATE_FAILED')
    return res.status(409).json({ error: error instanceof RegistrationError ? error.message : 'No se pudo guardar. Busca al paciente nuevamente antes de repetir el registro.' })
  }
}
