import { NextResponse } from 'next/server'
import { authorized, receive } from '@/lib/interop/intake'
import { IntakeError, type Format } from '@/lib/interop/normalize'
import { receiptStore } from '@/lib/interop/prisma-store'
export const runtime = 'nodejs'
const LIMIT = 128 * 1024
function reply(body: object, status: number) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
}
export async function POST(request: Request) {
  const blocked = guard(request)
  if (blocked) return blocked
  const source = process.env.INTEROP_SANDBOX_SOURCE!
  const format = request.headers.get('x-interop-format') as Format
  const types: Record<Format, string> = { 'api-json': 'application/json', 'fhir-r4': 'application/fhir+json', 'hl7-v2': 'text/plain' }
  if (!Object.hasOwn(types, format) || request.headers.get('content-type')?.split(';')[0].trim() !== types[format]) return reply({ error: 'UNSUPPORTED_MEDIA_TYPE' }, 415)
  try {
    const reader = request.body?.getReader()
    if (!reader) return reply({ error: 'EMPTY_BODY' }, 400)
    let length = 0
    const chunks: Uint8Array[] = []
    try {
      while (true) {
        const chunk = await reader.read()
        if (chunk.done) break
        length += chunk.value.byteLength
        if (length > LIMIT) { await reader.cancel(); throw new IntakeError('PAYLOAD_TOO_LARGE', 413) }
        chunks.push(chunk.value)
      }
    } finally { reader.releaseLock() }
    const payload = new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks))
    const result = await receive(receiptStore, source, format, payload)
    return reply({ mode: 'synthetic-sandbox', ...result }, result.duplicate ? 200 : 202)
  } catch (error) {
    if (error instanceof IntakeError) return reply({ error: error.code }, error.status)
    // No payloads, identifiers, tokens or database diagnostics in logs/responses.
    return reply({ error: 'INTAKE_UNAVAILABLE' }, 503)
  }
}

function guard(request: Request) {
  if (process.env.INTEROP_SANDBOX_ENABLED !== 'true' || process.env.ENLACE_ISOLATED_ENVIRONMENT !== 'true' || process.env.VERCEL_ENV === 'production') return reply({ error: 'NOT_FOUND' }, 404)
  if (!authorized(request.headers.get('authorization'), process.env.INTEROP_SANDBOX_TOKEN)) return reply({ error: 'UNAUTHORIZED' }, 401)
  const source = process.env.INTEROP_SANDBOX_SOURCE
  if (!source || !/^TEST-[A-Z0-9-]{1,64}$/.test(source)) return reply({ error: 'SOURCE_NOT_CONFIGURED' }, 503)
  return null
}
export async function GET(request: Request) {
  const blocked = guard(request)
  if (blocked) return blocked
  try {
    const receipts = await receiptStore.list(process.env.INTEROP_SANDBOX_SOURCE!)
    return reply({ mode: 'synthetic-sandbox', receipts, limit: 50 }, 200)
  } catch { return reply({ error: 'INTAKE_UNAVAILABLE' }, 503) }
}
