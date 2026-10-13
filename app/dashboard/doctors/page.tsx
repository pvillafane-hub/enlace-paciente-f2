import { getLicenseAccess } from '@/lib/license-access'
import { unstable_noStore as noStore } from 'next/cache'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getValidatedSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { revokeAccess } from './actions'
import InviteForm from './InviteForm'

export const dynamic = 'force-dynamic'

export default async function DoctorsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  noStore()
  const session = await getValidatedSession()
  if (!session) redirect('/?auth=required')
  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { id: true, role: true, active: true } })
  if (user?.role === 'DOCTOR' && user.active) redirect('/dashboard/requests')
  if (!user?.active || user.role !== 'PATIENT') redirect('/dashboard')
  const entitlement = await getLicenseAccess(user.id)
  const params = await searchParams
  const page = /^\d{1,4}$/.test(params.page || '') ? Math.max(1, Number(params.page)) : 1
  const where = { patientId: user.id }
  const [doctors, total, requests] = await Promise.all([
    prisma.doctorPatient.findMany({ where: { patientId: user.id, doctor: { active: true, role: 'DOCTOR' } }, select: { doctor: { select: { id: true, fullName: true, email: true } } } }),
    prisma.medicalAccessRequest.count({ where }),
    prisma.medicalAccessRequest.findMany({ where, take: 50, skip: (page - 1) * 50, orderBy: { updatedAt: 'desc' }, include: { doctor: { select: { fullName: true, email: true } } } }),
  ])
  return <div className="max-w-4xl mx-auto space-y-8">
    <h1 className="text-2xl font-bold">Gestión de acceso médico</h1>
    <section className="bg-white border rounded-xl p-6 space-y-4">
      <h2 className="text-lg font-semibold">Invitar a mi doctor</h2>
      {entitlement.active ? <InviteForm /> : <p>Renueva tu licencia para enviar invitaciones.</p>}
      <p>Al enviar la invitación autorizas compartir tu expediente con ese doctor. El acceso comienza cuando el doctor acepte.</p>
      <Link href="/dashboard/qr" className="text-blue-600 underline">Mostrar código al doctor</Link>
    </section>
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Estado de solicitudes ({total})</h2>
      <Link href="/dashboard/doctors/requests" className="text-blue-600 underline">Revisar solicitudes que requieren mi aprobación</Link>
      {!requests.length && <p>No tienes solicitudes en esta página.</p>}
      {requests.map(req => <div key={req.id} className="bg-white border rounded-xl p-4 space-y-2">
        <p className="font-semibold">{req.doctor.fullName}</p><p>{req.doctor.email}</p>
        <p className="font-semibold text-blue-800">{req.status === 'APPROVED' ? 'Acceso autorizado' : req.status === 'REJECTED' ? 'Solicitud rechazada' : req.initiatedBy === 'PATIENT' ? 'Invitación enviada · Pendiente de aceptación del doctor' : req.initiatedBy === 'DOCTOR' ? 'Solicitud recibida · Pendiente de tu aprobación' : 'Solicitud anterior · Origen no registrado'}</p>
        {req.status === 'PENDING' && req.initiatedBy === null && <p>Puedes revisar y aprobar esta solicitud, o reenviar la invitación con el email del doctor para que él la acepte.</p>}
        {req.status === 'PENDING' && <form action={revokeAccess}><input type="hidden" name="doctorId" value={req.doctorId} /><button className="text-red-700 underline">Cancelar solicitud</button></form>}
      </div>)}
      <nav className="flex gap-4" aria-label="Páginas de solicitudes">
        {page > 1 && <Link href={`?page=${page - 1}`}>Anteriores</Link>}
        {page * 50 < total && <Link href={`?page=${page + 1}`}>Siguientes</Link>}
      </nav>
    </section>
    <section className="space-y-4"><h2 className="text-xl font-semibold">Doctores con acceso</h2>
      {!doctors.length && <p>No tienes doctores con acceso todavía.</p>}
      {doctors.map(({ doctor }) => <div key={doctor.id} className="bg-white border rounded-xl p-4 space-y-2">
        <p className="font-semibold">{doctor.fullName}</p><p>{doctor.email}</p>
        <form action={revokeAccess}><input type="hidden" name="doctorId" value={doctor.id} /><button className="text-red-700 underline">Revocar acceso</button></form>
      </div>)}
    </section>
  </div>
}
