import { prisma } from '@/lib/prisma'
import { sandboxState, safeResultSummary } from './admin-view'
import { licenseAccess } from '@/lib/license-policy'

export const syntheticIdentity = { id: 'TEST-PATIENT-001', birthDate: '2018-04-12' }
export function eligibleSyntheticPatient(user: { email: string; role: string; active: boolean; identityStatus: string; dateOfBirth: Date | null } | null) {
  return Boolean(user && user.role === 'PATIENT' && user.active && user.identityStatus === 'CLEAR' && user.email.toLowerCase().endsWith('@example.test') && user.dateOfBirth?.toISOString().slice(0,10) === syntheticIdentity.birthDate)
}
export function deliverable(status: string) { return status === 'MATCHED' || status === 'MANUALLY_MATCHED' }
export async function deliveryModel() {
  if (sandboxState() !== 'ready') return null
  const source = process.env.INTEROP_SANDBOX_SOURCE!
  const [binding, candidates] = await Promise.all([
    prisma.interopSandboxPatient.findUnique({ where: { source_externalPatientId: { source, externalPatientId: syntheticIdentity.id } }, select: { userId: true, user: { select: { fullName: true, email: true } } } }),
    prisma.user.findMany({ where: { role: 'PATIENT', active: true, identityStatus: 'CLEAR', email: { endsWith: '@example.test', mode: 'insensitive' }, dateOfBirth: new Date('2018-04-12T00:00:00Z') }, select: { id: true, fullName: true, email: true }, take: 50, orderBy: { id: 'asc' } }),
  ])
  return { binding, candidates }
}
export async function bindSyntheticPatient(actorId: string, userId: string, reason: string) {
  if (sandboxState() !== 'ready') throw new Error('Disabled')
  const source = process.env.INTEROP_SANDBOX_SOURCE!
  await prisma.$transaction(async tx => {
    if (!await tx.user.findFirst({ where: { id: actorId, active: true, role: 'ADMIN' } })) throw new Error('Unauthorized')
    const user = await tx.user.findUnique({ where: { id: userId } })
    if (!eligibleSyntheticPatient(user)) throw new Error('Invalid synthetic identity')
    await tx.interopSandboxPatient.create({ data: { source, externalPatientId: syntheticIdentity.id, userId, createdById: actorId } })
    await tx.auditLog.create({ data: { userId: actorId, action: 'INTEROP_SYNTHETIC_PATIENT_BOUND', entityId: userId, metadata: { source, externalPatientId: syntheticIdentity.id, reason } } })
  })
}
export async function deliverSyntheticReceipt(actorId: string, receiptId: string, proxyVisible: boolean) {
  if (sandboxState() !== 'ready') throw new Error('Disabled')
  const source = process.env.INTEROP_SANDBOX_SOURCE!
  return prisma.$transaction(async tx => {
    if (!await tx.user.findFirst({ where: { id: actorId, active: true, role: 'ADMIN' } })) throw new Error('Unauthorized')
    const receipt = await tx.interopSandboxReceipt.findFirst({ where: { id: receiptId, source } })
    if (!receipt || !deliverable(receipt.status)) throw new Error('Not deliverable')
    if (receipt.deliveredAt) throw new Error('Already delivered')
    const summary = safeResultSummary(receipt.normalized)
    if (!summary) throw new Error('Invalid result')
    if (receipt.status === 'MATCHED' && (summary.patientId !== syntheticIdentity.id || summary.birthDate !== syntheticIdentity.birthDate)) throw new Error('Invalid identity')
    if (receipt.status === 'MANUALLY_MATCHED' && !await tx.interopSandboxEvent.findFirst({ where: { receiptId, action: 'IDENTITY_CONFIRMED_MANUALLY', patientId: syntheticIdentity.id, actorId: { not: null } } })) throw new Error('Missing review')
    const binding = await tx.interopSandboxPatient.findUnique({ where: { source_externalPatientId: { source, externalPatientId: syntheticIdentity.id } } })
    if (!binding) throw new Error('Missing binding')
    await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${binding.userId} FOR UPDATE`
    const patient = await tx.user.findUnique({ where: { id: binding.userId }, include: { licenses: { where: { role: 'PATIENT' } } } })
    if (!eligibleSyntheticPatient(patient) || !patient || !licenseAccess(patient.licenses).active) throw new Error('Patient unavailable or unlicensed')
    const document = await tx.document.create({ data: { userId: patient.id, filename: `PRUEBA-${receipt.reportId}.txt`, filePath: `interop-sandbox:${receipt.id}`, docType: 'Laboratorio', facility: `Laboratorio ficticio · ${source}`, studyDate: summary.issued.slice(0,10), proxyVisible } })
    const changed = await tx.interopSandboxReceipt.updateMany({ where: { id: receiptId, source, status: receipt.status, deliveredAt: null }, data: { deliveredAt: new Date(), deliveredDocumentId: document.id } })
    if (changed.count !== 1) throw new Error('Concurrent delivery')
    await tx.interopSandboxEvent.create({ data: { receiptId, action: 'DELIVERED_TO_SYNTHETIC_RECORD', actorId, patientId: patient.id, reason: proxyVisible ? 'Documento ficticio compartible con representantes autorizados.' : 'Documento ficticio privado para representantes.' } })
    await tx.auditLog.create({ data: { userId: actorId, action: 'INTEROP_SYNTHETIC_DELIVERED', entityId: document.id, metadata: { receiptId, patientId: patient.id, proxyVisible } } })
    return document.id
  })
}
export async function syntheticDocumentText(document: { id: string; userId: string; filePath: string }) {
  if (sandboxState() !== 'ready') return null
  const receipt = await prisma.interopSandboxReceipt.findFirst({ where: { deliveredDocumentId: document.id, source: process.env.INTEROP_SANDBOX_SOURCE!, deliveredAt: { not: null }, status: { in: ['MATCHED','MANUALLY_MATCHED'] } } })
  if (!receipt || document.filePath !== `interop-sandbox:${receipt.id}`) return null
  const patient = await prisma.user.findUnique({ where: { id: document.userId }, include: { licenses: { where: { role: 'PATIENT' } } } })
  if (!eligibleSyntheticPatient(patient) || !patient || !licenseAccess(patient.licenses).active) return null
  const data = safeResultSummary(receipt.normalized)
  if (!data) return null
  return ['SOLO PRUEBAS — SIN VALIDEZ CLÍNICA', `Paciente ficticio: ${patient.fullName}`, `Identidad verificada: ${syntheticIdentity.id}`, `Nacimiento verificado: ${syntheticIdentity.birthDate}`, `Identificador recibido: ${data.patientId}`, `Nacimiento recibido (sin modificar): ${data.birthDate}`, `Informe: ${receipt.reportId}`, `Fuente: ${receipt.source}`, `Emitido: ${data.issued}`, `Identificación: ${receipt.status === 'MANUALLY_MATCHED' ? 'Confirmada manualmente' : 'Coincidencia automática'}`, '', ...data.observations.map(row => `${row.code}: ${row.value} ${row.unit}`)].join('\n')
}
