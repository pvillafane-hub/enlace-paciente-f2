// Synthetic-only smoke test. Start an isolated app/database first; no migrations here.
import { readFile } from 'node:fs/promises'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
const base = new URL(process.env.INTEROP_TEST_BASE_URL || 'http://localhost:3000')
if (!['http:', 'https:'].includes(base.protocol) || (base.protocol === 'http:' && !['localhost', '127.0.0.1'].includes(base.hostname))) throw new Error('Use HTTPS for remote test servers')
if (['project-pmewh.vercel.app', 'enlace-salud-seven.vercel.app'].includes(base.hostname)) throw new Error('Do not use the clinical application')
const token = process.env.INTEROP_SANDBOX_TOKEN
assert(token?.length >= 32, 'Set a dedicated sandbox token in your environment')
const endpoint = new URL('/api/interop/sandbox', base)
async function post(format, payload) {
  const response = await fetch(endpoint, { method: 'POST', headers: { authorization: `Bearer ${token}`, 'x-interop-format': format, 'content-type': format === 'fhir-r4' ? 'application/fhir+json' : format === 'hl7-v2' ? 'text/plain' : 'application/json' }, body: payload })
  return { status: response.status, body: await response.json() }
}
const suffix = randomUUID().toUpperCase()
const id = `TEST-REPORT-${suffix}`
for (const [format, file] of [['api-json', 'lab-api.json'], ['fhir-r4', 'lab-fhir.json'], ['hl7-v2', 'lab-oru.hl7']]) {
  const payload = (await readFile(new URL(`../docs/interop/fixtures/${file}`, import.meta.url), 'utf8')).replaceAll('TEST-REPORT-001', id)
  const result = await post(format, payload)
  assert.equal(result.status, format === 'api-json' ? 202 : 200)
  assert.equal(result.body.mode, 'synthetic-sandbox'); assert.equal(result.body.status, 'MATCHED')
  assert.equal(result.body.duplicate, format !== 'api-json')
}
const api = JSON.parse(await readFile(new URL('../docs/interop/fixtures/lab-api.json', import.meta.url), 'utf8'))
api.reportId = id; api.observations[0].value = '13.2'
assert.equal((await post('api-json', JSON.stringify(api))).status, 409)
api.reportId = `TEST-REVIEW-${suffix}`; api.birthDate = '2018-04-13'
const pending = await post('api-json', JSON.stringify(api)); assert.equal(pending.status, 202); assert.equal(pending.body.status, 'PENDING_REVIEW')
const review = await fetch(endpoint, { headers: { authorization: `Bearer ${token}` } })
assert.equal(review.status, 200)
const list = await review.json(); assert(list.receipts.some(row => row.id === pending.body.receiptId))
console.log('PASS: three formats, retry, conflict, identity quarantine and persistent review queue')
console.log('Synthetic pending receipt:', pending.body.receiptId)
