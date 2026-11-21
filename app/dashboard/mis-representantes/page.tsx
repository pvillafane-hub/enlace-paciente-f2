import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getValidatedSession } from '@/lib/auth'
import { decideProxyConsent } from './actions'
export const dynamic = 'force-dynamic'
export default async function MisRepresentantes() {
  const session = await getValidatedSession()
  if (!session?.userId) redirect('/?auth=required')
  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { role: true, active: true } })
  if (!user?.active || user.role !== 'PATIENT') redirect('/dashboard')
  const links = await prisma.guardianLink.findMany({ where: { patientId: session.userId },
    include: { guardian: { select: { fullName: true, email: true } } }, orderBy: { createdAt: 'desc' } })
  const records = await Promise.all(links.map(async link => ({
    link,
    consented: link.reviewedAt ? Boolean(await prisma.auditLog.findFirst({
      where: { userId: session.userId, action: 'PATIENT_PROXY_CONSENT_GRANTED', entityId: link.id,
        createdAt: { gte: link.reviewedAt } }, select: { id: true } })) : false,
  })))
  return <main className="mx-auto max-w-3xl space-y-6 p-5">
    <h1 className="text-3xl font-bold">Mis autorizaciones de representantes</h1>
    <p>Decide quién puede consultar tus documentos compartibles. Revocar impide el acceso inmediatamente. Una relación familiar por sí sola no autoriza a consultar tu expediente.</p>
    {!records.length && <p>No tienes representantes registrados.</p>}
    {records.map(({link,consented}) => <section key={link.id} className="rounded-xl border bg-white p-5 space-y-3">
      <h2 className="text-xl font-semibold">{link.guardian.fullName}</h2>
      <p className="text-sm text-gray-600">{link.guardian.email}</p>
      <p>Estado administrativo: {link.status === 'ACTIVE' ? 'Verificado' : link.status === 'PENDING' ? 'Pendiente' : 'Revocado'}</p>
      <p>Tu consentimiento: {consented ? 'Confirmado' : 'No confirmado'}</p>
      {link.status === 'ACTIVE' && <div className="flex flex-wrap gap-3">
        {!consented && <form action={decideProxyConsent.bind(null,link.id,'APPROVE')}>
          <button className="rounded-lg bg-blue-700 px-4 py-3 text-white">Autorizar acceso</button></form>}
        <form action={decideProxyConsent.bind(null,link.id,'REVOKE')}>
          <button className="rounded-lg border border-red-700 px-4 py-3 text-red-700">Revocar acceso</button></form>
      </div>}
    </section>)}
  </main>
}
