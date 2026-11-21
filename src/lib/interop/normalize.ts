import { createHash } from 'node:crypto'

export type Format = 'api-json' | 'fhir-r4' | 'hl7-v2'
export type LabResult = {
  reportId: string
  patientId: string
  birthDate: string
  testCode: string
  issued: string
  observations: { code: string; value: string; unit: string }[]
}
export class IntakeError extends Error {
  constructor(public code: string, public status = 422) { super(code) }
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new IntakeError('INVALID_OBJECT')
  return value as Record<string, unknown>
}
function text(value: unknown, max = 200): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new IntakeError('INVALID_FIELD')
  return value.trim()
}
function date(value: unknown): string {
  const result = text(value, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(result) || !Number.isFinite(Date.parse(result)) || new Date(result).toISOString().slice(0, 10) !== result) throw new IntakeError('INVALID_DATE')
  return result
}
function coding(value: unknown): string {
  const codes = object(value).coding
  if (!Array.isArray(codes) || codes.length !== 1) throw new IntakeError('ONE_CODING_REQUIRED')
  const code = object(codes[0])
  if (code.system !== 'http://loinc.org') throw new IntakeError('LOINC_REQUIRED')
  return text(code.code)
}
function identifier(value: unknown, system: string): string {
  if (!Array.isArray(value) || value.length !== 1) throw new IntakeError('ONE_IDENTIFIER_REQUIRED')
  const id = object(value[0])
  if (id.system !== system) throw new IntakeError('UNSUPPORTED_IDENTIFIER_SYSTEM')
  return text(id.value)
}
function json(payload: string): Record<string, unknown> {
  try { return object(JSON.parse(payload)) } catch { throw new IntakeError('INVALID_JSON') }
}
function api(payload: string): LabResult {
  const data = json(payload)
  if (data.status !== 'final') throw new IntakeError('FINAL_ONLY')
  if (!Array.isArray(data.observations) || data.observations.length < 1 || data.observations.length > 100) throw new IntakeError('INVALID_OBSERVATIONS')
  return {
    reportId: text(data.reportId), patientId: text(data.patientId), birthDate: date(data.birthDate),
    testCode: text(data.testCode), issued: text(data.issued),
    observations: data.observations.map(value => {
      const row = object(value)
      return { code: text(row.code), value: text(row.value, 1000), unit: row.unit === undefined || row.unit === '' ? '' : text(row.unit) }
    }),
  }
}
function fhir(payload: string): LabResult {
  const bundle = json(payload)
  if (bundle.resourceType !== 'Bundle' || bundle.type !== 'collection' || !Array.isArray(bundle.entry) || bundle.entry.length > 102) throw new IntakeError('COLLECTION_BUNDLE_REQUIRED')
  const resources = bundle.entry.map(value => {
    const entry = object(value)
    const resource = object(entry.resource)
    if (resource.modifierExtension) throw new IntakeError('MODIFIER_EXTENSIONS_NOT_SUPPORTED')
    return { resource, ref: text(entry.fullUrl) }
  })
  if (new Set(resources.map(item => item.ref)).size !== resources.length) throw new IntakeError('DUPLICATE_REFERENCE')
  const patients = resources.filter(item => item.resource.resourceType === 'Patient')
  const reports = resources.filter(item => item.resource.resourceType === 'DiagnosticReport')
  const observations = resources.filter(item => item.resource.resourceType === 'Observation')
  if (patients.length !== 1 || reports.length !== 1 || observations.length < 1 || resources.length !== patients.length + reports.length + observations.length) throw new IntakeError('UNSUPPORTED_BUNDLE_PROFILE')
  const patient = patients[0], report = reports[0].resource
  if (report.status !== 'final' || object(report.subject).reference !== patient.ref || report.presentedForm) throw new IntakeError('UNSUPPORTED_REPORT')
  if (!Array.isArray(report.result) || report.result.length !== observations.length) throw new IntakeError('INVALID_RESULT_REFERENCES')
  const refs = report.result.map(value => text(object(value).reference))
  if (new Set(refs).size !== refs.length) throw new IntakeError('DUPLICATE_REFERENCE')
  return {
    reportId: identifier(report.identifier, 'urn:enlace:synthetic:reports'), patientId: identifier(patient.resource.identifier, 'urn:enlace:synthetic'),
    birthDate: date(patient.resource.birthDate), testCode: coding(report.code), issued: text(report.issued),
    observations: refs.map(ref => {
      const observation = observations.find(item => item.ref === ref)?.resource
      if (!observation || observation.status !== 'final' || object(observation.subject).reference !== patient.ref) throw new IntakeError('INVALID_OBSERVATION_REFERENCE')
      const quantity = object(observation.valueQuantity)
      if (quantity.comparator || quantity.system !== 'http://unitsofmeasure.org') throw new IntakeError('UCUM_EXACT_QUANTITY_REQUIRED')
      if (typeof quantity.value !== 'number' || !Number.isFinite(quantity.value)) throw new IntakeError('NUMERIC_QUANTITY_REQUIRED')
      return { code: coding(observation.code), value: String(quantity.value), unit: text(quantity.code) }
    }),
  }
}
function hl7(payload: string): LabResult {
  const segments = payload.trim().split(/\r\n|\r|\n/).map(line => line.split('|'))
  const msh = segments[0]
  if (msh?.[0] !== 'MSH' || msh[1] !== '^~\\&' || msh[8] !== 'ORU^R01' || msh[10] !== 'T' || msh[11] !== '2.5.1') throw new IntakeError('UNSUPPORTED_HL7_PROFILE')
  // This test profile deliberately rejects repetitions, escapes, attachments and additional orders.
  if (segments.slice(1).some(row => row.some(field => /[~\\]/.test(field)))) throw new IntakeError('UNSUPPORTED_HL7_ENCODING')
  const pids = segments.filter(row => row[0] === 'PID'), obrs = segments.filter(row => row[0] === 'OBR'), obxs = segments.filter(row => row[0] === 'OBX')
  if (pids.length !== 1 || obrs.length !== 1 || obxs.length < 1 || obxs.length > 100 || segments.some(row => !['MSH','PID','OBR','OBX'].includes(row[0]))) throw new IntakeError('UNSUPPORTED_HL7_SEGMENTS')
  if (segments[1] !== pids[0] || segments[2] !== obrs[0] || obrs[0][25] !== 'F') throw new IntakeError('FINAL_SINGLE_ORDER_REQUIRED')
  const dob = text(pids[0][7], 8), timestamp = text(obrs[0][22], 14)
  if (!/^\d{8}$/.test(dob) || !/^\d{14}$/.test(timestamp)) throw new IntakeError('INVALID_HL7_DATE')
  return {
    reportId: text(obrs[0][3]?.split('^')[0]), patientId: text(pids[0][3]?.split('^')[0]),
    birthDate: date(`${dob.slice(0,4)}-${dob.slice(4,6)}-${dob.slice(6,8)}`),
    testCode: text(obrs[0][4]?.split('^')[0]),
    issued: `${timestamp.slice(0,4)}-${timestamp.slice(4,6)}-${timestamp.slice(6,8)}T${timestamp.slice(8,10)}:${timestamp.slice(10,12)}:${timestamp.slice(12,14)}Z`,
    observations: obxs.map(row => {
      if (row[2] !== 'NM' || row[11] !== 'F' || !/^-?\d+(\.\d+)?$/.test(row[5] ?? '')) throw new IntakeError('FINAL_NUMERIC_OBSERVATION_REQUIRED')
      return { code: text(row[3]?.split('^')[0]), value: text(row[5]), unit: text(row[6]?.split('^')[0]) }
    }),
  }
}
export function normalize(format: Format, payload: string): LabResult {
  const result = format === 'api-json' ? api(payload) : format === 'fhir-r4' ? fhir(payload) : format === 'hl7-v2' ? hl7(payload) : (() => { throw new IntakeError('UNSUPPORTED_FORMAT') })()
  if (!/^TEST-[A-Z0-9-]+$/.test(result.patientId)) throw new IntakeError('SYNTHETIC_PATIENT_REQUIRED')
  date(result.issued.slice(0, 10))
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(result.issued) || !Number.isFinite(Date.parse(result.issued))) throw new IntakeError('INVALID_ISSUED_DATE')
  return result
}
export function fingerprint(result: LabResult): string {
  return createHash('sha256').update(JSON.stringify(result)).digest('hex')
}
export function matchSyntheticPatient(result: LabResult): 'MATCHED' | 'PENDING_REVIEW' {
  // Deliberately isolated from User/Document: never resolve a clinical account in this sandbox.
  return result.patientId === 'TEST-PATIENT-001' && result.birthDate === '2018-04-12' ? 'MATCHED' : 'PENDING_REVIEW'
}
