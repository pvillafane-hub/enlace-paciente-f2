import { prisma } from '@/lib/prisma'
import { getValidatedSession } from '@/lib/auth'
import { canReadPatient, clinicDoctorId } from '@/lib/access'
import { getLicenseAccess } from '@/lib/license-access'
import { redirect } from 'next/navigation'
import GuardianForm from 'app/dashboard/admin/guardians/GuardianForm'
import ConfirmUserForm from 'app/dashboard/admin/users/ConfirmUserForm'
import { requestRepresentative, setProxyVisibility } from './actions'
export default async function RepresentativesPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getValidatedSession()
  if (!session) redirect('/?auth=required')
  const { id } = await params
  const actor = await prisma.user.findUnique({ where: { id: session.userId } })
  if (!actor || !await clinicDoctorId(actor) || !await canReadPatient(actor, id)) redirect('/dashboard')
  const entitlement = await getLicenseAccess(actor.id)
  const patient = await prisma.user.findUnique({ where: { id }, select: { fullName: true } })
  if (!patient) redirect('/dashboard')
  if (!entitlement.active) return <p>Necesitas licencia activa para solicitar vínculos o gestionar documentos para representantes.</p>
  const documents = await prisma.document.findMany({ where: { userId: id, deletedAt: null }, select: { id: true, filename: true, proxyVisible: true }, orderBy: { createdAt: 'desc' }, take: 100 })
  return <div className="space-y-6"><h1 className="text-2xl font-bold">Representantes de {patient.fullName}</h1><p>Solicita el vínculo a Admin. El adulto debe tener su propia cuenta; no compartas la contraseña del menor.</p>
    <GuardianForm action={requestRepresentative.bind(null, id)} message={`Solicitar a Admin un representante para ${patient.fullName}. No concede acceso inmediato.`}>
      <label className="block">Correo del adulto<input name="guardianEmail" type="email" required className="block w-full rounded-xl border p-3" /></label>
      <label className="block">Relación<select name="relationship" className="block rounded-xl border p-3"><option value="PADRE">Padre</option><option value="MADRE">Madre</option><option value="TUTOR_LEGAL">Tutor legal</option></select></label>
    </GuardianForm>
    <h2 className="text-xl font-semibold">Documentos compartibles con representantes</h2><p>Todos los documentos anteriores permanecen privados para representantes hasta que la clínica los revise. No marques información confidencial que no corresponda compartir. Se muestran los últimos 100 documentos.</p>
    {documents.map(doc => <article key={doc.id} className="rounded-xl border bg-white p-4 space-y-3"><p className="font-semibold break-words">{doc.filename}</p><p>{doc.proxyVisible ? 'Disponible para representantes autorizados' : 'Privado para representantes'}</p>
      <ConfirmUserForm action={setProxyVisibility.bind(null, id, doc.id)} message={`Cambiar el acceso de representantes al documento ${doc.filename}.`}>
        <input type="hidden" name="proxyVisible" value={doc.proxyVisible ? 'false' : 'true'} />
        {!doc.proxyVisible && <label className="flex gap-3"><input name="reviewConfirmed" type="checkbox" required />Revisé que este documento se puede compartir con representantes autorizados.</label>}
        <button className="min-h-12 rounded-xl border p-3">{doc.proxyVisible ? 'Dejar privado' : 'Permitir a representantes'}</button>
      </ConfirmUserForm>
    </article>)}
  </div>
}
