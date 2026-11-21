import Link from 'next/link'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireActiveAdmin } from '@/lib/admin-session'
import { licenseDateInput, licenseRevision } from '@/lib/admin-license-policy'
import { addLicense, modifyLicense, disableLicense } from './actions'
import LicenseForm from './LicenseForm'

export default async function AdminLicensesPage({ searchParams }: { searchParams: Promise<{ query?: string; status?: string; page?: string }> }) {
  await requireActiveAdmin(true)
  const params = await searchParams
  const query = (typeof params.query === 'string' ? params.query : '').trim().slice(0, 200)
  const page = /^\d{1,4}$/.test(params.page || '') ? Math.max(1, Number(params.page)) : 1
  const status = ['ACTIVE', 'INACTIVE', 'EXPIRED'].includes(params.status || '') ? params.status : ''
  const now = new Date()
  const where: Prisma.LicenseWhereInput = {
    ...(query ? { user: { OR: [{ email: { contains: query, mode: 'insensitive' } }, { fullName: { contains: query, mode: 'insensitive' } }] } } : {}),
    ...(status === 'ACTIVE' ? { status: 'ACTIVE', OR: [{ validUntil: null }, { validUntil: { gt: now } }] } : {}),
    ...(status === 'INACTIVE' ? { status: 'INACTIVE' } : {}),
    ...(status === 'EXPIRED' ? { status: 'ACTIVE', validUntil: { lte: now } } : {}),
  }
  const [licenses, total] = await Promise.all([
    prisma.license.findMany({ where, include: { user: { select: { fullName: true, email: true, role: true, active: true } } }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 25, skip: (page - 1) * 25 }),
    prisma.license.count({ where }),
  ])
  const href = (nextPage: number) => `/dashboard/admin/licenses?${new URLSearchParams({ query, status: status || '', page: String(nextPage) })}`
  return <div className="space-y-6">
    <header><h1 className="text-3xl font-bold">Gestión de licencias</h1><p className="text-gray-600 mt-2">Crea, modifica o desactiva licencias de doctores y pacientes. Los cambios manuales no realizan cobros y quedan registrados en <Link href="/dashboard/admin/logs" className="underline text-blue-700">Auditoría</Link>.</p></header>
    <section className="bg-white border rounded-xl p-5" aria-labelledby="new-license"><h2 id="new-license" className="text-xl font-semibold mb-4">Añadir licencia</h2><p className="mb-4 text-gray-600">La cuenta debe existir y estar activa. Si ya tiene una licencia, utiliza Modificar.</p><LicenseForm action={addLicense} mode="create" /></section>
    <form method="GET" className="flex flex-wrap gap-3 bg-white border rounded-xl p-4">
      <label className="flex-1">Buscar cuenta<input name="query" defaultValue={query} placeholder="Correo o nombre" maxLength={200} className="block w-full border rounded px-3 py-2" /></label>
      <label>Estado<select name="status" defaultValue={status} className="block border rounded px-3 py-2"><option value="">Todos</option><option value="ACTIVE">Activas</option><option value="INACTIVE">Desactivadas</option><option value="EXPIRED">Vencidas</option></select></label>
      <button className="self-end bg-blue-700 text-white px-4 py-2 rounded">Buscar</button><Link href="/dashboard/admin/licenses" className="self-end px-4 py-2 underline">Limpiar</Link>
    </form>
    <h2 className="text-xl font-semibold">Licencias encontradas: {total}</h2>
    {!licenses.length && <p className="bg-white border rounded-xl p-5">No hay licencias para estos filtros en esta página.</p>}
    <div className="grid lg:grid-cols-2 gap-5">
      {licenses.map(license => {
        const expired = license.status === 'ACTIVE' && license.validUntil !== null && license.validUntil <= now
        const label = expired ? 'Vencida' : license.status === 'ACTIVE' ? 'Activa' : license.status === 'INACTIVE' ? 'Desactivada' : 'Estado previo: ' + license.status
        const revision = licenseRevision(license)
        return <article key={license.id} className="bg-white border rounded-xl p-5 space-y-3">
          <h3 className="text-lg font-semibold">{license.user.fullName}</h3><p className="break-all">{license.user.email}</p>
          <p className="text-sm text-gray-600">Rol de la cuenta: {license.user.role === 'DOCTOR' ? 'Doctor' : license.user.role === 'PATIENT' ? 'Paciente' : license.user.role} · {license.user.active ? 'Cuenta activa' : 'Cuenta inactiva'}</p>
          <p><strong>{label}</strong> · Plan {license.plan || 'Sin plan'} · {license.validUntil ? `Vence: ${licenseDateInput(license.validUntil)}` : 'Sin vencimiento'}</p>
          <details><summary className="cursor-pointer text-blue-700 font-semibold">Modificar o reactivar</summary><div className="mt-4"><LicenseForm mode="modify" target={license.user.email} action={modifyLicense.bind(null, license.id, revision)} initial={{ plan: license.plan, status: license.status, validUntil: licenseDateInput(license.validUntil), unlimited: license.validUntil === null }} /></div></details>
          {license.status !== 'INACTIVE' && <details><summary className="cursor-pointer text-red-700 font-semibold">Desactivar</summary><div className="mt-4"><LicenseForm mode="disable" target={license.user.email} action={disableLicense.bind(null, license.id, revision)} /></div></details>}
        </article>
      })}
    </div>
    <nav aria-label="Páginas de licencias" className="flex gap-4"><span>Página {page}</span>{page > 1 && <Link className="underline" href={href(page - 1)}>Anterior</Link>}{page * 25 < total && <Link className="underline" href={href(page + 1)}>Siguiente</Link>}</nav>
  </div>
}
