import { prisma } from '@/lib/prisma'

export async function decideAccess(patientId: string, requestId: string, approved: boolean) {
  return prisma.$transaction(async tx => {
    const patient = await tx.user.findFirst({ where: { id: patientId, role: 'PATIENT', active: true }, select: { id: true } })
    if (!patient) throw new Error('Unauthorized')
    const request = await tx.medicalAccessRequest.findFirst({
      where: { id: requestId, patientId, status: 'PENDING', OR: [{ initiatedBy: 'DOCTOR' }, { initiatedBy: null }], doctor: { role: 'DOCTOR', active: true } },
    })
    if (!request) throw new Error('Solicitud no disponible')
    const claimed = await tx.medicalAccessRequest.updateMany({
      where: { id: request.id, patientId, status: 'PENDING', updatedAt: request.updatedAt, OR: [{ initiatedBy: 'DOCTOR' }, { initiatedBy: null }] },
      data: { status: approved ? 'APPROVED' : 'REJECTED' },
    })
    if (claimed.count !== 1) throw new Error('Solicitud ya procesada')
    if (approved) await tx.doctorPatient.upsert({
      where: { doctorId_patientId: { doctorId: request.doctorId, patientId } }, update: {},
      create: { doctorId: request.doctorId, patientId },
    })
    await tx.auditLog.create({ data: { userId: patientId, action: approved ? 'ACCESS_APPROVED' : 'ACCESS_REJECTED', entityId: request.id } })
  }, { isolationLevel: 'Serializable' })
}

export async function requestPatientAccess(doctorId: string, patientId: string) {
  return prisma.$transaction(async tx => {
    const doctor = await tx.user.findFirst({ where: { id: doctorId, role: 'DOCTOR', active: true }, select: { id: true } })
    const patient = await tx.user.findFirst({ where: { id: patientId, role: 'PATIENT', active: true }, select: { id: true } })
    if (!doctor || !patient || doctorId === patientId) throw new Error('No autorizado')
    if (await tx.doctorPatient.findUnique({ where: { doctorId_patientId: { doctorId, patientId } } })) return
    const existing = await tx.medicalAccessRequest.findUnique({ where: { doctorId_patientId: { doctorId, patientId } } })
    if (existing?.status === 'PENDING' && existing.initiatedBy) return
    const request = await tx.medicalAccessRequest.upsert({
      where: { doctorId_patientId: { doctorId, patientId } }, update: { status: 'PENDING', initiatedBy: 'DOCTOR' },
      create: { doctorId, patientId, status: 'PENDING', initiatedBy: 'DOCTOR' },
    })
    await tx.auditLog.create({ data: { userId: doctorId, action: 'ACCESS_REQUESTED', entityId: request.id, metadata: { initiatedBy: 'DOCTOR' } } })
  }, { isolationLevel: 'Serializable' })
}

export async function inviteDoctorAccess(patientId: string, doctorId: string) {
  return prisma.$transaction(async tx => {
    const patient = await tx.user.findFirst({ where: { id: patientId, role: 'PATIENT', active: true }, select: { id: true } })
    const doctor = await tx.user.findFirst({ where: { id: doctorId, role: 'DOCTOR', active: true }, select: { id: true } })
    if (!patient || !doctor || patientId === doctorId) throw new Error('No autorizado')
    if (await tx.doctorPatient.findUnique({ where: { doctorId_patientId: { doctorId, patientId } } })) return
    const existing = await tx.medicalAccessRequest.findUnique({ where: { doctorId_patientId: { doctorId, patientId } } })
    if (existing?.status === 'PENDING' && existing.initiatedBy === 'PATIENT') return
    // The patient explicitly consents by inviting. The doctor must still accept.
    const request = await tx.medicalAccessRequest.upsert({
      where: { doctorId_patientId: { doctorId, patientId } },
      update: { status: 'PENDING', initiatedBy: 'PATIENT' },
      create: { doctorId, patientId, status: 'PENDING', initiatedBy: 'PATIENT' },
    })
    await tx.auditLog.create({ data: { userId: patientId, action: 'DOCTOR_INVITED', entityId: request.id, metadata: { initiatedBy: 'PATIENT', doctorId } } })
  }, { isolationLevel: 'Serializable' })
}

export async function decideDoctorInvitation(doctorId: string, requestId: string, approved: boolean) {
  return prisma.$transaction(async tx => {
    if (!await tx.user.findFirst({ where: { id: doctorId, role: 'DOCTOR', active: true }, select: { id: true } })) throw new Error('No autorizado')
    const request = await tx.medicalAccessRequest.findFirst({
      where: { id: requestId, doctorId, initiatedBy: 'PATIENT', status: 'PENDING', patient: { role: 'PATIENT', active: true } },
    })
    if (!request) throw new Error('Invitación no disponible')
    const claimed = await tx.medicalAccessRequest.updateMany({
      where: { id: request.id, doctorId, initiatedBy: 'PATIENT', status: 'PENDING', updatedAt: request.updatedAt },
      data: { status: approved ? 'APPROVED' : 'REJECTED' },
    })
    if (claimed.count !== 1) throw new Error('Invitación ya procesada')
    if (approved) await tx.doctorPatient.upsert({
      where: { doctorId_patientId: { doctorId, patientId: request.patientId } }, update: {},
      create: { doctorId, patientId: request.patientId },
    })
    await tx.auditLog.create({ data: { userId: doctorId, action: approved ? 'DOCTOR_INVITATION_ACCEPTED' : 'DOCTOR_INVITATION_REJECTED', entityId: request.id } })
  }, { isolationLevel: 'Serializable' })
}
