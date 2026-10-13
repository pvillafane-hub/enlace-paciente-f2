import { getValidatedSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canReadPatient } from '@/lib/access'
import { activeGuardian } from '@/lib/guardian-access'
import { getLicenseAccess } from '@/lib/license-access'
import { redirect } from 'next/navigation'
import UploadClient from './UploadClient'
export default async function UploadPage({ searchParams }: { searchParams: Promise<{ patientId?: string }> }) {
  const session = await getValidatedSession()
  if (!session) redirect('/?auth=required')
  const actor = await prisma.user.findUnique({ where: { id: session.userId } })
  if (!actor) redirect('/dashboard')
  const params = await searchParams
  const targetId = typeof params.patientId === 'string' && params.patientId ? params.patientId : actor.id
  const guardian = await activeGuardian(actor, targetId)
  if (!await canReadPatient(actor, targetId) && !guardian?.canUpload) redirect('/dashboard')
  if (!(await getLicenseAccess(actor.id)).active) redirect('/dashboard?checkout=license-required')
  const patient = await prisma.user.findUnique({ where: { id: targetId }, select: { fullName: true, dateOfBirth: true } })
  if (!patient) redirect('/dashboard')
  return <UploadClient representative={Boolean(guardian)} patientId={targetId === actor.id ? null : targetId} patientName={patient.fullName} patientBirth={patient.dateOfBirth?.toLocaleDateString('es-PR', { timeZone: 'UTC' }) || 'No registrado'} returnPath={guardian ? `/dashboard/dependents/${targetId}` : `/dashboard/patients/${targetId}`} />
}
