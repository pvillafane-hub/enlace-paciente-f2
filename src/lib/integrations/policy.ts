export const protocolLabels = { API_JSON: 'API JSON', FHIR_R4: 'FHIR R4', HL7_V2: 'HL7 v2' } as const
export const directionLabels = { INBOUND: 'El laboratorio envía resultados', OUTBOUND: 'Enlace Salud consulta al laboratorio' } as const
export const authLabels = { BEARER: 'Token Bearer', OAUTH2: 'OAuth 2.0', MTLS: 'Certificado de cliente (mTLS)' } as const
export type IntegrationValues = {
  name: string; code: string; protocol: keyof typeof protocolLabels; direction: keyof typeof directionLabels;
  endpoint: string; authType: keyof typeof authLabels; credentialRef: string; reviewAll: boolean; notes: string; status: 'DRAFT' | 'PAUSED'
}
export const emptyIntegration: IntegrationValues = { name: '', code: '', protocol: 'API_JSON', direction: 'INBOUND', endpoint: '', authType: 'BEARER', credentialRef: '', reviewAll: true, notes: '', status: 'DRAFT' }
export function integrationValues(data: FormData): IntegrationValues {
  const read = (key: string) => String(data.get(key) || '').trim()
  const name = read('name'), code = read('code').toUpperCase(), protocol = read('protocol'), direction = read('direction')
  const endpoint = read('endpoint'), authType = read('authType'), credentialRef = read('credentialRef'), notes = read('notes'), status = read('status')
  if (name.length < 3 || name.length > 120) throw new Error('Escribe un nombre de laboratorio de 3 a 120 caracteres.')
  if (!/^TEST-[A-Z0-9-]{1,59}$/.test(code)) throw new Error('Usa un código único de pruebas: TEST- seguido de letras, números o guiones (hasta 64 caracteres).')
  if (!Object.hasOwn(protocolLabels, protocol) || !Object.hasOwn(directionLabels, direction) || !Object.hasOwn(authLabels, authType)) throw new Error('Selecciona un formato, dirección y autenticación válidos.')
  if (!['DRAFT','PAUSED'].includes(status)) throw new Error('Solo se permiten borradores o configuraciones pausadas.')
  if (endpoint) {
    let url: URL
    try { url = new URL(endpoint) } catch { throw new Error('Escribe una dirección HTTPS válida para el sistema del laboratorio.') }
    if (endpoint.length > 500 || url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) throw new Error('La dirección debe usar HTTPS y no incluir credenciales, parámetros ni fragmentos.')
  }
  if (credentialRef && (!/^(?:env:[A-Z][A-Z0-9_]{2,99}|secret:[A-Za-z0-9_./-]{3,180}|arn:aws:secretsmanager:[A-Za-z0-9_:/.-]{3,160})$/.test(credentialRef))) throw new Error('Indica solo el nombre o referencia segura de la credencial, sin tokens, contraseñas ni enlaces.')
  if (notes.length > 1000) throw new Error('Las notas admiten hasta 1000 caracteres.')
  return { name, code, protocol: protocol as IntegrationValues['protocol'], direction: direction as IntegrationValues['direction'], endpoint, authType: authType as IntegrationValues['authType'], credentialRef, reviewAll: data.get('reviewAll') === 'on', notes, status: status as IntegrationValues['status'] }
}
export function preparationIssues(values: Pick<IntegrationValues, 'direction' | 'endpoint' | 'credentialRef'>) {
  return [...(values.direction === 'OUTBOUND' && !values.endpoint ? ['Falta la dirección del sistema del laboratorio.'] : []), ...(!values.credentialRef ? ['Falta la referencia de la credencial.'] : [])]
}
