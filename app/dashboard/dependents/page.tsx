import { prisma } from '@/lib/prisma'
import { getValidatedSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { relationshipLabel } from '@/lib/guardian-policy'
export default async function DependentsPage() {
  const session = await getValidatedSession()
  if (!session) redirect('/?auth=required')
  const actor = await prisma.user.findFirst({ where: { id: session.userId, role: 'PATIENT', active: true }, select: { id: true } })
  if (!actor) redirect('/dashboard')
  const links = await prisma.guardianLink.findMany({ where: { guardianId: actor.id, status: 'ACTIVE', validUntil: { gt: new Date() }, patient: { role: 'PATIENT', active: true } }, select: { id: true, status: true, relationship: true, validUntil: true, patientId: true, patient: { select: { fullName: true, dateOfBirth: true } } }, orderBy: { createdAt: 'desc' } })
  return <div className="space-y-5"><h1 className="text-3xl font-bold">Personas a mi cargo</h1><p>Selecciona a la persona antes de consultar o cargar documentos. Cada expediente está separado del tuyo.</p>
    {!links.length && <p>No tienes vínculos activos. La clínica puede solicitar uno y Admin debe verificarlo. Los vínculos pendientes, vencidos o revocados no permiten consultar expedientes.</p>}
    {links.map(link => { const active = link.status === 'ACTIVE' && link.validUntil && link.validUntil > new Date(); return <article key={link.id} className="rounded-xl border bg-white p-5 space-y-3"><h2 className="text-xl font-semibold">{link.patient.fullName}</h2><p>{link.patient.dateOfBirth?.toLocaleDateString('es-PR', { timeZone: 'UTC' }) || 'Nacimiento no registrado'} · {relationshipLabel(link.relationship)}</p><p>{active ? 'Vínculo activo' : link.status === 'PENDING' ? 'Pendiente de verificación de Admin' : link.status === 'REVOKED' ? 'Acceso revocado' : 'Vínculo vencido · solicita revisión'}</p>{active && <Link href={`/dashboard/dependents/${link.patientId}`} className="inline-flex min-h-12 items-center rounded-xl bg-blue-700 px-4 py-3 text-white">Ver expediente autorizado</Link>}</article> })}
  </div>
}
