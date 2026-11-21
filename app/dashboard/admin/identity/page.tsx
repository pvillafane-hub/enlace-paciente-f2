import { prisma } from '@/lib/prisma'
import { requireActiveAdmin } from '@/lib/admin-session'
import ReviewForm from './ReviewForm'
export default async function IdentityReviews({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  await requireActiveAdmin()
  const params = await searchParams
  const page = Math.max(1, Math.floor(Number(params.page) || 1))
  const [count, reviews] = await prisma.$transaction([
    prisma.identityReview.count({ where: { status: 'PENDING' } }),
    prisma.identityReview.findMany({ where: { status: 'PENDING' }, include: { user: { select: { fullName: true, email: true, dateOfBirth: true, contactPhone: true } } }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], take: 20, skip: (page-1)*20 }),
  ])
  const ids = Array.from(new Set(reviews.flatMap(r => r.candidateIds)))
  const candidates = await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, fullName: true, email: true, dateOfBirth: true, contactPhone: true, identityStatus: true } })
  const birth = (d: Date | null) => d?.toLocaleDateString('es-PR', { timeZone: 'UTC' }) || 'No registrado'
  return <main className="space-y-6"><h1 className="text-3xl font-bold">Verificación de identidad</h1><p role="status">{count} registros pendientes de revisión.</p><p>Una coincidencia no prueba que sea la misma persona. Valida con el usuario antes de decidir. No se fusionan expedientes ni se conceden permisos sobre el registro existente.</p>
  {reviews.map(r => { const matches = candidates.filter(c => r.candidateIds.includes(c.id)); return <article key={r.id} className="rounded-xl border bg-white p-5 space-y-3"><h2 className="text-xl font-semibold">{r.user.fullName}</h2><p>{r.user.email} · {birth(r.user.dateOfBirth)} · {r.user.contactPhone || 'Sin teléfono'}</p><p>Origen: {r.doctorId ? 'Registro asistido' : 'Registro del usuario'} · Cuenta bloqueada</p><h3 className="font-semibold">Posibles coincidencias</h3>{matches.map(c => <p key={c.id}>{c.fullName} · {c.email} · {birth(c.dateOfBirth)} · {c.contactPhone || 'Sin teléfono'} · {c.identityStatus}</p>)}<ReviewForm id={r.id} candidates={matches} /></article> })}
  {!count && <p>No hay revisiones pendientes.</p>}<nav className="flex gap-5">{page > 1 && <a href={`?page=${page-1}`}>Anterior</a>}{page*20<count && <a href={`?page=${page+1}`}>Siguiente</a>}</nav></main>
}
