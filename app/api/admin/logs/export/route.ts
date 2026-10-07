import { prisma } from '@/lib/prisma'
import { getValidatedSession } from '@/lib/auth'
import { NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { csvCell } from '@/lib/csv'

export async function GET(req: Request) {
  const session = await getValidatedSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const admin = await prisma.user.findFirst({ where: { id: session.userId, role: 'ADMIN', active: true }, select: { id: true } })
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search'), from = searchParams.get('from'), to = searchParams.get('to')
  if ((search && search.length > 200) || (from && !Number.isFinite(new Date(from).getTime())) || (to && !Number.isFinite(new Date(to).getTime()))) return NextResponse.json({ error: 'Invalid filters' }, { status: 400 })
  const where: Prisma.AuditLogWhereInput = {
    ...(search ? { user: { OR: [{ email: { contains: search, mode: 'insensitive' } }, { fullName: { contains: search, mode: 'insensitive' } }] } } : {}),
    ...(from || to ? { createdAt: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) } } : {}),
  }
  const logs = await prisma.auditLog.findMany({ where, include: { user: { select: { email: true } } }, orderBy: { createdAt: 'desc' }, take: 5001 })
  const rows = logs.slice(0, 5000).map(log => [log.user.email, log.action, log.metadata ? JSON.stringify(log.metadata) : '', log.createdAt.toISOString()].map(csvCell).join(','))
  await prisma.auditLog.create({ data: { userId: admin.id, action: 'AUDIT_EXPORTED', metadata: { count: rows.length } } })
  return new NextResponse('Usuario,Accion,Detalle,Fecha\n' + rows.join('\n'), { headers: {
    'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename=logs.csv',
    'Cache-Control': 'private, no-store', 'X-Export-Truncated': String(logs.length > 5000),
  } })
}
