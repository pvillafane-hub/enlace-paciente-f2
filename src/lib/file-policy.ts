export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024
export function detectDocumentType(bytes: Uint8Array): string | null {
  const b = Buffer.from(bytes)
  if (b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return 'image/png'
  if (b.length >= 3 && b[0] === 255 && b[1] === 216 && b[2] === 255) return 'image/jpeg'
  if (b.length >= 12 && b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8,12).toString() === 'WEBP') return 'image/webp'
  if (b.length >= 5 && b.subarray(0,5).toString() === '%PDF-') return 'application/pdf'
  return null
}
export function validDateOnly(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(value + 'T00:00:00Z')
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0,10) === value
}
