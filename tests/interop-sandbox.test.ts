import { readFileSync } from 'node:fs'
import { beforeEach, expect, it, vi } from 'vitest'
import { normalize, fingerprint } from '../src/lib/interop/normalize'
import { authorized, receive, type Receipt, type ReceiptStore } from '../src/lib/interop/intake'
const fixture = (file: string) => readFileSync(`docs/interop/fixtures/${file}`, 'utf8')
const api = () => JSON.parse(fixture('lab-api.json'))
const m = vi.hoisted(() => ({ find: vi.fn(), create: vi.fn(), event: vi.fn(), list: vi.fn() }))
vi.mock('@/lib/interop/prisma-store', () => ({ receiptStore: m }))
import { GET, POST } from '../app/api/interop/sandbox/route'
const token = 'test-token-for-synthetic-intake-123456789'
function request(body = fixture('lab-api.json'), headers: Record<string, string> = {}) {
  return new Request('http://localhost/api/interop/sandbox', { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', 'x-interop-format': 'api-json', ...headers }, body })
}
beforeEach(() => {
  vi.stubEnv('INTEROP_SANDBOX_ENABLED', 'true'); vi.stubEnv('ENLACE_ISOLATED_ENVIRONMENT', 'true'); vi.stubEnv('VERCEL_ENV', 'preview')
  vi.stubEnv('INTEROP_SANDBOX_TOKEN', token); vi.stubEnv('INTEROP_SANDBOX_SOURCE', 'TEST-LAB')
  vi.clearAllMocks(); m.find.mockResolvedValue(null); m.event.mockResolvedValue(undefined)
  m.create.mockImplementation(async value => ({ id: 'receipt-1', ...value }))
})
it('normalizes equivalent API, FHIR R4 and ORU R01 synthetic results identically', () => {
  const expected = normalize('api-json', fixture('lab-api.json'))
  expect(normalize('fhir-r4', fixture('lab-fhir.json'))).toEqual(expected)
  expect(normalize('hl7-v2', fixture('lab-oru.hl7'))).toEqual(expected)
})
it('rejects an unresolved FHIR result reference instead of silently dropping it', () => {
  const b = JSON.parse(fixture('lab-fhir.json')); b.entry[1].resource.result[0].reference = 'https://external.test/Observation/1'
  expect(() => normalize('fhir-r4', JSON.stringify(b))).toThrow('INVALID_OBSERVATION_REFERENCE')
})
it('rejects duplicate FHIR references and nonfinal reports', () => {
  const b = JSON.parse(fixture('lab-fhir.json')); b.entry.push(b.entry[0])
  expect(() => normalize('fhir-r4', JSON.stringify(b))).toThrow('DUPLICATE_REFERENCE')
  expect(() => normalize('api-json', JSON.stringify({ ...api(), status: 'preliminary' }))).toThrow('FINAL_ONLY')
})
it('rejects clinical identifiers and invalid dates', () => {
  expect(() => normalize('api-json', JSON.stringify({ ...api(), patientId: 'real-account' }))).toThrow('SYNTHETIC_PATIENT_REQUIRED')
  expect(() => normalize('api-json', JSON.stringify({ ...api(), birthDate: '2018-02-30' }))).toThrow('INVALID_DATE')
  expect(() => normalize('api-json', JSON.stringify({ ...api(), birthDate: '2018-99-99' }))).toThrow('INVALID_DATE')
})
it('rejects HL7 production processing, multiple patients and unsupported value types', () => {
  const message = fixture('lab-oru.hl7')
  expect(() => normalize('hl7-v2', message.replace('|T|2.5.1', '|P|2.5.1'))).toThrow('UNSUPPORTED_HL7_PROFILE')
  expect(() => normalize('hl7-v2', message + 'PID|2\n')).toThrow('UNSUPPORTED_HL7_SEGMENTS')
  expect(() => normalize('hl7-v2', message.replace('|NM|', '|ED|'))).toThrow('FINAL_NUMERIC_OBSERVATION_REQUIRED')
})
it('fails closed for missing or weak bearer credentials', () => {
  expect(authorized(null, token)).toBe(false); expect(authorized('Bearer secret', 'secret')).toBe(false)
  expect(authorized(`Bearer ${token}`, token)).toBe(true)
})
it('requires both isolation flags and blocks production', async () => {
  vi.stubEnv('VERCEL_ENV', 'production'); expect((await POST(request())).status).toBe(404)
  vi.stubEnv('VERCEL_ENV', 'preview'); vi.stubEnv('ENLACE_ISOLATED_ENVIRONMENT', 'false'); expect((await POST(request())).status).toBe(404)
  expect(m.find).not.toHaveBeenCalled()
})
it('rejects unauthenticated intake without touching persistence', async () => {
  expect((await POST(request(undefined, { authorization: 'Bearer wrong' }))).status).toBe(401)
  expect(m.find).not.toHaveBeenCalled()
})
it('enforces payload size, format and content type', async () => {
  expect((await POST(request('x'.repeat(131073)))).status).toBe(413)
  expect((await POST(request(undefined, { 'content-type': 'text/plain' }))).status).toBe(415)
  expect((await POST(request(undefined, { 'x-interop-format': 'toString' }))).status).toBe(415)
})
it('returns matched receipt with no clinical import', async () => {
  const response = await POST(request()); expect(response.status).toBe(202)
  expect(await response.json()).toMatchObject({ mode: 'synthetic-sandbox', status: 'MATCHED', duplicate: false })
  expect(m.create).toHaveBeenCalledWith(expect.objectContaining({ source: 'TEST-LAB', reportId: 'TEST-REPORT-001' }))
})
it('quarantines unknown identifiers and conflicting birth dates', async () => {
  for (const change of [{ patientId: 'TEST-UNKNOWN' }, { birthDate: '2018-04-13' }]) {
    const response = await POST(request(JSON.stringify({ ...api(), ...change })))
    expect((await response.json()).status).toBe('PENDING_REVIEW')
  }
})
it('duplicate retransmission returns same receipt and records retry', async () => {
  m.find.mockResolvedValue({ id: 'existing', status: 'MATCHED', fingerprint: fingerprint(normalize('api-json', fixture('lab-api.json'))) })
  const response = await POST(request()); expect(response.status).toBe(200)
  expect(await response.json()).toMatchObject({ receiptId: 'existing', duplicate: true })
  expect(m.create).not.toHaveBeenCalled(); expect(m.event).toHaveBeenCalledWith('existing', 'DUPLICATE_RECEIVED')
})
it('refuses overwriting a prior report with different content', async () => {
  m.find.mockResolvedValue({ id: 'existing', status: 'MATCHED', fingerprint: 'different' })
  expect((await POST(request())).status).toBe(409)
  expect(m.event).toHaveBeenCalledWith('existing', 'CONFLICT_REJECTED'); expect(m.create).not.toHaveBeenCalled()
})
it('handles a concurrent unique-index collision as a retry', async () => {
  const row = { id: 'existing', status: 'MATCHED', fingerprint: fingerprint(normalize('api-json', fixture('lab-api.json'))) }
  m.find.mockResolvedValueOnce(null).mockResolvedValueOnce(row); m.create.mockRejectedValue({ code: 'P2002' })
  expect((await POST(request())).status).toBe(200)
})
it('keeps source namespaces separate and survives store recreation', async () => {
  const rows = new Map<string, Receipt>()
  const store = (): ReceiptStore => ({
    list: async () => [],
    find: async (source, id) => rows.get(source + id) ?? null,
    create: async value => { const row = { id: String(rows.size), ...value }; rows.set(value.source + value.reportId, row); return row },
    event: async () => {},
  })
  const first = await receive(store(), 'TEST-A', 'api-json', fixture('lab-api.json'))
  expect((await receive(store(), 'TEST-A', 'fhir-r4', fixture('lab-fhir.json'))).receiptId).toBe(first.receiptId)
  expect((await receive(store(), 'TEST-B', 'api-json', fixture('lab-api.json'))).duplicate).toBe(false)
})
it('does not leak payload or database diagnostics on backend failure', async () => {
  m.find.mockRejectedValue(new Error('private database details'))
  const response = await POST(request()); expect(response.status).toBe(503)
  expect(await response.text()).not.toContain('private')
  expect(response.headers.get('cache-control')).toBe('no-store')
})

it('exposes only authenticated source-scoped synthetic receipts for review', async () => {
  m.list.mockResolvedValue([{ id: 'r1', status: 'PENDING_REVIEW' }])
  const response = await GET(request()); expect(response.status).toBe(200)
  expect(m.list).toHaveBeenCalledWith('TEST-LAB')
  expect((await response.json()).receipts[0].status).toBe('PENDING_REVIEW')
  expect((await GET(request(undefined, { authorization: '' }))).status).toBe(401)
})
it('rejects foreign patient namespaces, comparators and FHIR modifier extensions', () => {
  const b = JSON.parse(fixture('lab-fhir.json'))
  b.entry[0].resource.identifier[0].system = 'urn:other-lab'
  expect(() => normalize('fhir-r4', JSON.stringify(b))).toThrow('UNSUPPORTED_IDENTIFIER_SYSTEM')
  b.entry[0].resource.identifier[0].system = 'urn:enlace:synthetic'
  b.entry[2].resource.valueQuantity.comparator = '<'
  expect(() => normalize('fhir-r4', JSON.stringify(b))).toThrow('UCUM_EXACT_QUANTITY_REQUIRED')
  b.entry[0].resource.modifierExtension = [{}]
  expect(() => normalize('fhir-r4', JSON.stringify(b))).toThrow('MODIFIER_EXTENSIONS_NOT_SUPPORTED')
})
