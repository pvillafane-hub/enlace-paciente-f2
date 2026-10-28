import { prisma } from '@/lib/prisma'

export const interopStatuses = ['ALL', 'MATCHED', 'PENDING_REVIEW'] as const
export type InteropFilter = typeof interopStatuses[number]
export function interopFilter(value: unknown): InteropFilter {
  return value === 'MATCHED' || value === 'PENDING_REVIEW' ? value : 'ALL'
}
export function sandboxState() {
  if (process.env.INTEROP_SANDBOX_ENABLED !== 'true' || process.env.ENLACE_ISOLATED_ENVIRONMENT !== 'true' || process.env.VERCEL_ENV === 'production') return 'disabled' as const
  if (!process.env.INTEROP_SANDBOX_TOKEN || process.env.INTEROP_SANDBOX_TOKEN.length < 32 || !/^TEST-[A-Z0-9-]{1,64}$/.test(process.env.INTEROP_SANDBOX_SOURCE || '')) return 'unconfigured' as const
  return 'ready' as const
}
export async function adminInteropReceipts(filter: InteropFilter) {
  // Call only after requireActiveAdmin. Never query staging tables while disabled.
  const state = sandboxState()
  if (state !== 'ready') return { state, receipts: [] }
  try {
    const receipts = await prisma.interopSandboxReceipt.findMany({
      where: { source: process.env.INTEROP_SANDBOX_SOURCE!, ...(filter === 'ALL' ? {} : { status: filter }) },
      select: { id: true, source: true, reportId: true, status: true, format: true, normalized: true, createdAt: true,
        events: { orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 5, select: { id: true, action: true, createdAt: true } } },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 50,
    })
    return { state: 'ready' as const, receipts }
  } catch { return { state: 'unavailable' as const, receipts: [] } }
}
export function safeResultSummary(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const data = value as Record<string, unknown>
  const field = (key: string) => typeof data[key] === 'string' ? data[key] as string : 'No disponible'
  const observations = Array.isArray(data.observations) ? data.observations.slice(0, 100).flatMap(value => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return []
    const row = value as Record<string, unknown>
    if (typeof row.code !== 'string' || typeof row.value !== 'string' || typeof row.unit !== 'string') return []
    return [{ code: row.code, value: row.value, unit: row.unit }]
  }) : []
  return { patientId: field('patientId'), birthDate: field('birthDate'), testCode: field('testCode'), issued: field('issued'), observations }
}
