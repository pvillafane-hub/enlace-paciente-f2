import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { requireActiveAdmin } from '@/lib/admin-session'
import { relationshipLabel } from '@/lib/guardian-policy'
import GuardianForm from './GuardianForm'
import { createPendingLink, reviewGuardian } from './actions'
export default async function GuardiansPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; page?: string; patientSearch?: string }> }) {
  await requireActiveAdmin(true)
  const params = await searchParams
  const q = typeof params.q === 'string' ? params.q.trim().slice(0, 150) : ''
  const status = ['PENDING','ACTIVE','REVOKED'].includes(params.status || '') ? params.status : undefined
  const page = /^\d{1,4}$/.test(params.page || '') ? Math.max(1, Number(params.page)) : 1
  const patientSearch = typeof params.patientSearch === 'string' ? params.patientSearch.trim().slice(0, 150) : ''
  const candidates = patientSearch.length >= 2 ? await prisma.user.findMany({ where: { role: 'PATIENT', active: true, fullName: { contains: patientSearch, mode: 'insensitive' } }, select: { id: true, fullName: true, dateOfBirth: true }, orderBy: { fullName: 'asc' }, take: 20 }) : []
  const where = { ...(status ? { status } : {}), ...(q ? { OR: [{ guardian: { OR: [{ fullName: { contains: q, mode: 'insensitive' as const } }, { email: { contains: q, mode: 'insensitive' as const } }] } }, { patient: { fullName: { contains: q, mode: 'insensitive' as const } } }] } : {}) }
  const [links, total] = await Promise.all([prisma.guardianLink.findMany({ where, include: { guardian: { select: { fullName: true, email: true } }, patient: { select: { fullName: true, dateOfBirth: true } } }, take: 25, skip: (page - 1) * 25, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] }), prisma.guardianLink.count({ where })])
  return <div className="min-w-0 space-y-6"><h1 className="text-3xl font-bold">Padres y tutores</h1>
    <p>Admin verifica cada vínculo. Estar registrado como representante no concede acceso hasta su aprobación. Solo se comparten documentos marcados por la clínica para representantes; el vínculo debe revisarse antes de su vencimiento.</p>
    <section className="rounded-xl border bg-white p-5 space-y-4"><h2 className="text-xl font-semibold">Registrar vínculo pendiente</h2><form method="GET" className="space-y-3"><label className="block">Buscar paciente por nombre<input name="patientSearch" defaultValue={patientSearch} minLength={2} maxLength={150} className="block w-full rounded-xl border p-3" /></label><button className="min-h-12 rounded-xl border p-3">Buscar paciente</button></form><p>Busca y selecciona al paciente por nombre y nacimiento. Se muestran hasta 20 coincidencias; escribe un nombre más completo si hace falta.</p>
      <GuardianForm action={createPendingLink} message="Registrar una relación pendiente. Esto no concede acceso.">
        <label className="block">Correo del adulto<input name="guardianEmail" type="email" required maxLength={254} className="block w-full border rounded-xl p-3" /></label>
        <label className="block">Paciente<select name="patientId" required className="block w-full border rounded-xl p-3"><option value="">Selecciona un paciente</option>{candidates.map(p => <option key={p.id} value={p.id}>{p.fullName} · {p.dateOfBirth?.toLocaleDateString("es-PR", { timeZone: "UTC" }) || "Nacimiento no registrado"}</option>)}</select></label>
        <label className="block">Relación<select name="relationship" className="block w-full border rounded-xl p-3"><option value="PADRE">Padre</option><option value="MADRE">Madre</option><option value="TUTOR_LEGAL">Tutor legal</option></select></label>
      </GuardianForm>
    </section>
    <form method="GET" className="flex flex-wrap gap-3"><label>Buscar<input name="q" defaultValue={q} className="block border rounded-xl p-3" /></label><label>Estado<select name="status" defaultValue={status || ''} className="block border rounded-xl p-3"><option value="">Todos</option><option value="PENDING">Pendientes</option><option value="ACTIVE">Activos</option><option value="REVOKED">Revocados</option></select></label><button className="min-h-12 self-end border rounded-xl p-3">Buscar</button></form>
    <p>{total} vínculos encontrados</p>{!links.length && <p>No hay vínculos en esta página.</p>}
    {links.map(link => <article key={link.id} className="rounded-xl border bg-white p-5 space-y-3"><h2 className="text-xl font-semibold">{link.guardian.fullName} → {link.patient.fullName}</h2><p className="break-all">{link.guardian.email}</p><p>{relationshipLabel(link.relationship)} · {link.status === 'PENDING' ? 'Pendiente de verificación' : link.status === 'REVOKED' ? 'Revocado' : link.validUntil && link.validUntil <= new Date() ? 'Vencido · sin acceso' : 'Activo'}</p><p>Paciente: {link.patient.dateOfBirth?.toLocaleDateString('es-PR', { timeZone: 'UTC' }) || 'Nacimiento no registrado'}</p>
      <GuardianForm action={reviewGuardian.bind(null, link.id, link.updatedAt.toISOString())} message={`Revisar el acceso de ${link.guardian.fullName} al expediente de ${link.patient.fullName}. La activación concede acceso a documentos compartibles y, si lo eliges, carga de documentos.`}>
        <label className="block">Relación<select name="relationship" defaultValue={link.relationship} className="block rounded-xl border p-3"><option value="PADRE">Padre</option><option value="MADRE">Madre</option><option value="TUTOR_LEGAL">Tutor legal</option></select></label>
        <label className="block">Decisión<select name="status" defaultValue={link.status === 'REVOKED' ? 'REVOKED' : 'ACTIVE'} className="block w-full border rounded-xl p-3"><option value="ACTIVE">Aprobar / actualizar</option><option value="REVOKED">Revocar / rechazar</option></select></label>
        <label className="flex min-h-12 items-start gap-3"><input name="authorityVerified" type="checkbox" className="mt-1 h-6 w-6 shrink-0" />Verifiqué la identidad y la autoridad del padre, madre o tutor; revisé las restricciones aplicables.</label>
        <label className="flex min-h-12 items-start gap-3"><input name="minorVerified" type="checkbox" className="mt-1 h-6 w-6 shrink-0" />Confirmé que el paciente es menor y que este vínculo corresponde al alcance permitido por la clínica.</label>
        <label className="flex min-h-12 items-start gap-3"><input name="canUpload" type="checkbox" defaultChecked={link.canUpload} />Permitir cargar documentos (requiere licencia activa del adulto).</label>
        <p>Elige una revisión que no exceda el cambio previsto de autoridad o las restricciones de edad definidas por la clínica.</p><label className="block">Vencimiento / próxima revisión<input name="validUntil" type="date" defaultValue={link.validUntil?.toLocaleDateString('en-CA', { timeZone: 'America/Puerto_Rico' })} className="block min-h-12 w-full min-w-0 border rounded-xl p-3" /></label>
        <label className="block">Motivo y referencia de verificación<textarea name="reason" required minLength={10} maxLength={500} className="block w-full border rounded-xl p-3" /></label><p>No incluyas números de identificación ni documentos de identidad en este campo.</p>
      </GuardianForm>
    </article>)}
    <nav className="flex flex-wrap gap-4">{page > 1 && <Link href={`?${new URLSearchParams({ q, status: status || '', page: String(page - 1) })}`}>Anteriores</Link>}{page * 25 < total && <Link href={`?${new URLSearchParams({ q, status: status || '', page: String(page + 1) })}`}>Siguientes</Link>}</nav>
  </div>
}
