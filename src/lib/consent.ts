import { prisma } from '@/lib/prisma'

export async function decideAccess(patientId: string, requestId: string, approved: boolean) {
  return prisma.$transaction(async tx => {
    const patient = await tx.user.findFirst({ where: { id: patientId, role: 'PATIENT', active: true }, select: { id: true } })
    if (!patient) throw new Error('Unauthorized')
    const request = await tx.medicalAccessRequest.findFirst({
      where: { id: requestId, patientId, status: 'PENDING', doctor: { role: 'DOCTOR', active: true } },
    })
    if (!request) throw new Error('Solicitud no disponible')
    const claimed = await tx.medicalAccessRequest.updateMany({
      where: { id: request.id, patientId, status: 'PENDING' },
      data: { status: approved ? 'APPROVED' : 'REJECTED' },
    })
    if (claimed.count !== 1) throw new Error('Solicitud ya procesada')
    if (approved) await tx.doctorPatient.upsert({
      where: { doctorId_patientId: { doctorId: request.doctorId, patientId } }, update: {},
      create: { doctorId: request.doctorId, patientId },
    })
    await tx.auditLog.create({ data: { userId: patientId, action: approved ? 'ACCESS_APPROVED' : 'ACCESS_REJECTED', entityId: request.id } })
  })
}

export async function requestPatientAccess(doctorId: string, patientId: string) {
  return prisma.$transaction(async tx => {
    const doctor = await tx.user.findFirst({ where: { id: doctorId, role: 'DOCTOR', active: true }, select: { id: true } })
    const patient = await tx.user.findFirst({ where: { id: patientId, role: 'PATIENT', active: true }, select: { id: true } })
    if (!doctor || !patient || doctorId === patientId) throw new Error('No autorizado')
    if (await tx.doctorPatient.findUnique({ where: { doctorId_patientId: { doctorId, patientId } } })) return
    await tx.medicalAccessRequest.upsert({
      where: { doctorId_patientId: { doctorId, patientId } }, update: { status: 'PENDING' },
      create: { doctorId, patientId, status: 'PENDING' },
    })
    await tx.auditLog.create({ data: { userId: doctorId, action: 'ACCESS_REQUESTED', entityId: patientId } })
  })
}
