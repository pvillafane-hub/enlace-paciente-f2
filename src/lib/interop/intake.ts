import { createHash, timingSafeEqual } from 'node:crypto'
import { fingerprint, IntakeError, matchSyntheticPatient, normalize, type Format, type LabResult } from './normalize'

export type Receipt = { id: string; fingerprint: string; status: string }
export interface ReceiptStore {
  list(source: string): Promise<unknown[]>
  find(source: string, reportId: string): Promise<Receipt | null>
  create(input: { source: string; reportId: string; fingerprint: string; status: string; format: Format; normalized: LabResult }): Promise<Receipt>
  event(id: string, action: string): Promise<void>
}
export function authorized(header: string | null, token: string | undefined): boolean {
  if (!token || token.length < 32 || !header) return false
  const digest = (value: string) => createHash('sha256').update(value).digest()
  return timingSafeEqual(digest(header), digest(`Bearer ${token}`))
}
export async function receive(store: ReceiptStore, source: string, format: Format, payload: string) {
  const normalized = normalize(format, payload), hash = fingerprint(normalized)
  const duplicate = async (row: Receipt) => {
    const conflict = row.fingerprint !== hash
    await store.event(row.id, conflict ? 'CONFLICT_REJECTED' : 'DUPLICATE_RECEIVED')
    if (conflict) throw new IntakeError('REPORT_ID_CONFLICT', 409)
    return { receiptId: row.id, status: row.status, duplicate: true }
  }
  const existing = await store.find(source, normalized.reportId)
  if (existing) return duplicate(existing)
  try {
    const row = await store.create({ source, reportId: normalized.reportId, fingerprint: hash, status: matchSyntheticPatient(normalized), format, normalized })
    return { receiptId: row.id, status: row.status, duplicate: false }
  } catch (error) {
    // A unique index handles simultaneous retries across processes, not an in-memory cache.
    if (typeof error !== 'object' || error === null || !('code' in error) || error.code !== 'P2002') throw error
    const row = await store.find(source, normalized.reportId)
    if (!row) throw error
    return duplicate(row)
  }
}
