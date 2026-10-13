import { prisma } from '@/lib/prisma'
import { getValidatedSession } from '@/lib/auth'
import { activeGuardian } from '@/lib/guardian-access'
import { getLicenseAccess } from '@/lib/license-access'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import DocumentSearch from '@/components/DocumentSearch'
export default async function DependentPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getValidatedSession()
  if (!session) redirect('/?auth=required')
  const { id } = await params
  const actor = await prisma.user.findUnique({ where: { id: session.userId } })
  const link = actor ? await activeGuardian(actor, id) : null
  if (!link) redirect('/dashboard/dependents')
  const entitlement = await getLicenseAccess(session.userId)
  const patient = await prisma.user.findUnique({ where: { id }, select: { fullName: true, dateOfBirth: true } })
  if (!patient) redirect('/dashboard/dependents')
  const documents = await prisma.document.findMany({ where: { userId: id, deletedAt: null, proxyVisible: true, ...entitlement.documentWhere }, select: { id: true, filename: true, docType: true, facility: true, studyDate: true, createdAt: true, bodyPart: true, specialty: true }, orderBy: { createdAt: 'desc' } })
  return <div className="space-y-5"><header className="rounded-xl border bg-blue-50 p-5"><h1 className="text-2xl font-bold">Expediente de {patient.fullName}</h1><p>Nacimiento: {patient.dateOfBirth?.toLocaleDateString('es-PR', { timeZone: 'UTC' }) || 'No registrado'}</p><p>Estás actuando como representante. Confirma el nombre antes de subir documentos.</p></header>
    <p>Solo se muestran documentos compartibles con representantes. Este listado puede no contener toda la información clínica.</p>
    {link.canUpload && entitlement.active && <Link href={`/dashboard/upload?patientId=${id}`} className="inline-flex min-h-12 items-center rounded-xl bg-blue-700 px-4 py-3 text-white">Subir documento para {patient.fullName}</Link>}
    <DocumentSearch documents={documents.map(doc => ({ ...doc, createdAt: doc.createdAt.toISOString(), filePath: '', canOpen: entitlement.active }))} />
    <Link href="/dashboard/dependents" className="inline-flex min-h-12 items-center underline">Volver a personas a mi cargo</Link>
  </div>
}
