import Link from 'next/link'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getValidatedSession } from '@/lib/auth'
import { getAuthorizedMinorProxy } from '@/lib/guardian-proxy-access'

export const dynamic = 'force-dynamic'

export default async function RepresentadosPage() {
  const session = await getValidatedSession()
  if (!session?.userId) redirect('/?auth=required')
  const actor = await prisma.user.findUnique({ where: { id: session.userId }, select: { role: true, active: true } })
  if (!actor?.active || actor.role !== 'PATIENT') redirect('/dashboard')
  const links = await prisma.guardianLink.findMany({
    where: { guardianId: session.userId },
    include: { patient: { select: { id: true, fullName: true } } },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
  const entries = await Promise.all(links.map(async link => {
    const authorized = await getAuthorizedMinorProxy(session.userId, link.patientId)
    const documents = authorized ? await prisma.document.findMany({
      where: { userId: link.patientId, deletedAt: null, proxyVisible: true },
      select: { id: true, filename: true, docType: true, studyDate: true },
      orderBy: { createdAt: 'desc' }, take: 50,
    }) : []
    return { link, authorized: Boolean(authorized), documents }
  }))
  return <main className="mx-auto max-w-4xl space-y-6 p-5">
    <h1 className="text-3xl font-bold">Mis representados</h1>
    <p className="text-gray-700">Consulta únicamente documentos autorizados de menores bajo tu representación verificada. Los expedientes de adultos requieren una validación legal independiente.</p>
    <Link className="text-blue-700 underline" href="/dashboard">Volver a mi expediente</Link>
    {!entries.length && <p className="rounded-xl border bg-white p-5">No tienes representados registrados.</p>}
    {entries.map(({ link, authorized, documents }) => <section key={link.id} className="rounded-xl border bg-white p-5 space-y-3">
      <h2 className="text-xl font-semibold">{link.patient.fullName}</h2>
      {!authorized ? <p className="text-amber-800">Acceso no disponible. El vínculo puede estar pendiente, revocado, vencido o corresponder a una persona adulta. Consulta con administración para verificar su situación.</p> :
        <><p className="text-green-800">Representación verificada y vigente · documentos compartibles</p>
          {!documents.length && <p>No hay documentos habilitados para representantes.</p>}
          <ul className="space-y-2">{documents.map(doc => <li key={doc.id} className="rounded-lg border p-3">
            <a className="font-medium text-blue-700 underline" href={`/api/documents/view?id=${encodeURIComponent(doc.id)}`} target="_blank" rel="noopener noreferrer">{doc.filename}</a>
            <p className="text-sm text-gray-600">{doc.docType} · {doc.studyDate}</p>
          </li>)}</ul></>}
    </section>)}
  </main>
}
