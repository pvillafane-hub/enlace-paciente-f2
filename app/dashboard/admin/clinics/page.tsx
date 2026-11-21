import { prisma } from '@/lib/prisma'
import { getValidatedSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { createClinic, updateClinic, setClinicStatus, associateUser, removeAssociation } from './actions'

export const dynamic = 'force-dynamic'
const field = 'w-full rounded-lg border px-3 py-2 text-sm'
const button = 'rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800'
export default async function ClinicOnboardingPage() {
  const session = await getValidatedSession()
  if (!session?.userId) redirect('/?auth=required')
  const admin = await prisma.user.findUnique({ where: { id: session.userId }, select: { active: true, role: true } })
  if (!admin?.active || admin.role !== 'ADMIN') redirect('/dashboard')
  const clinics = await prisma.organization.findMany({
    include: { members: { include: { user: { select: { fullName: true, email: true } } }, orderBy: { createdAt: 'desc' } },
      patients: { include: { patient: { select: { fullName: true, email: true } } }, orderBy: { createdAt: 'desc' } } },
    orderBy: { createdAt: 'desc' },
  })
  return <div className="space-y-8">
    <header><h1 className="text-3xl font-bold text-slate-900">Onboard Clinic</h1>
      <p className="mt-2 text-slate-600">Alta, configuración y activación de clínicas. Las asociaciones no otorgan acceso médico: el paciente autoriza por separado.</p></header>
    <section className="rounded-xl border bg-white p-6 shadow-sm space-y-4">
      <h2 className="text-xl font-semibold">1. Registrar clínica nueva</h2>
      <form action={createClinic} className="grid gap-3 md:grid-cols-2">
        <label>Nombre de la clínica *<input name="name" required minLength={3} maxLength={160} className={field} placeholder="Clínica Morovis" /></label>
        <label>Identificador único *<input name="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" className={field} placeholder="clinica-morovis" /></label>
        <label>Dirección<input name="address" className={field} maxLength={160}/></label>
        <label>Municipio<input name="city" className={field} maxLength={160}/></label>
        <label>Teléfono<input name="phone" type="tel" className={field} maxLength={160}/></label>
        <label>Correo de contacto<input name="email" type="email" className={field} maxLength={160}/></label>
        <label>Contacto principal<input name="contactName" className={field} maxLength={160}/></label>
        <label>Plan comercial<input name="plan" className={field} maxLength={160} placeholder="Piloto / Básico / Premium"/></label>
        <div className="md:col-span-2"><button className={button}>Crear clínica inactiva</button><p className="mt-2 text-xs text-slate-500">La clínica se crea INACTIVA y requiere activación explícita por ADMIN.</p></div>
      </form>
    </section>
    <section className="space-y-4"><h2 className="text-xl font-semibold">2. Clínicas registradas ({clinics.length})</h2>
      {clinics.map(c => <article key={c.id} className="rounded-xl border bg-white p-6 space-y-5">
        <div className="flex flex-wrap justify-between gap-3"><div><h3 className="text-xl font-bold">{c.name}</h3><p className="text-sm text-slate-500">{c.slug} · {c.city || 'Sin municipio'}</p></div>
          <span className="rounded-full border px-3 py-1 text-sm font-semibold">{c.status}</span></div>
        <form action={updateClinic} className="grid gap-3 md:grid-cols-2">
          <input type="hidden" name="organizationId" value={c.id}/>
          <label>Nombre<input name="name" defaultValue={c.name} required className={field}/></label>
          <label>Dirección<input name="address" defaultValue={c.address || ''} className={field}/></label>
          <label>Municipio<input name="city" defaultValue={c.city || ''} className={field}/></label>
          <label>Teléfono<input name="phone" defaultValue={c.phone || ''} className={field}/></label>
          <label>Correo<input name="email" type="email" defaultValue={c.email || ''} className={field}/></label>
          <label>Contacto<input name="contactName" defaultValue={c.contactName || ''} className={field}/></label>
          <label>Plan<input name="plan" defaultValue={c.plan || ''} className={field}/></label>
          <div className="flex items-end"><button className={button}>Guardar información</button></div>
        </form>
        <div className="flex flex-wrap gap-2 items-center"><span className="text-sm font-semibold">Estado:</span>
          {(['ACTIVE','SUSPENDED','INACTIVE'] as const).map(status => <form key={status} action={setClinicStatus}>
            <input type="hidden" name="organizationId" value={c.id}/><input type="hidden" name="status" value={status}/>
            <button disabled={c.status === status} className="rounded border px-3 py-2 text-sm disabled:opacity-40">{status === 'ACTIVE' ? 'Activar' : status === 'SUSPENDED' ? 'Suspender' : 'Desactivar'}</button>
          </form>)}</div>
        <div className="rounded-lg bg-slate-50 p-4 space-y-3">
          <h4 className="font-semibold">3. Asociar personal o pacientes</h4>
          <form action={associateUser} className="grid gap-2 md:grid-cols-3">
            <input type="hidden" name="organizationId" value={c.id}/>
            <input name="email" type="email" required className={field} placeholder="Correo de cuenta existente"/>
            <select name="kind" className={field}><option value="DOCTOR">Médico</option><option value="NURSE">Enfermería</option><option value="STAFF">Personal</option><option value="PATIENT">Paciente</option><option value="ADMIN">Administrador de clínica</option></select>
            <button className={button}>Asociar cuenta</button>
          </form>
          <p className="text-xs text-slate-500">Las cuentas deben existir y tener un rol compatible. Una asociación no concede acceso a expedientes.</p>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <div><h4 className="font-semibold mb-2">Personal ({c.members.filter(m=>m.active).length})</h4>
            {c.members.filter(m=>m.active).map(m=><div key={m.id} className="flex items-center justify-between gap-2 border-b py-2 text-sm">
              <span>{m.user.fullName} <span className="text-slate-500">({m.role})</span><span className="block text-xs">{m.user.email}</span></span>
              <form action={removeAssociation}><input type="hidden" name="organizationId" value={c.id}/><input type="hidden" name="userId" value={m.userId}/><input type="hidden" name="kind" value="MEMBER"/><button className="text-red-700">Desasociar</button></form>
            </div>)}</div>
          <div><h4 className="font-semibold mb-2">Pacientes ({c.patients.filter(p=>p.active).length})</h4>
            {c.patients.filter(p=>p.active).map(p=><div key={p.id} className="flex items-center justify-between gap-2 border-b py-2 text-sm">
              <span>{p.patient.fullName}<span className="block text-xs text-slate-500">{p.patient.email}</span></span>
              <form action={removeAssociation}><input type="hidden" name="organizationId" value={c.id}/><input type="hidden" name="userId" value={p.patientId}/><input type="hidden" name="kind" value="PATIENT"/><button className="text-red-700">Desasociar</button></form>
            </div>)}</div>
        </div>
      </article>)}
    </section>
  </div>
}
