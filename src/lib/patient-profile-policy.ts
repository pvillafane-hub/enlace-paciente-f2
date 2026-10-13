import { validDateOnly } from '@/lib/file-policy'
export const UNKNOWN_PROFILE_VALUE = 'No lo sé'
export const NO_KNOWN_ALLERGIES = 'No tengo alergias conocidas'
export type AllergyState = '' | 'known' | 'none' | 'unknown'
export function allergyState(value: string): AllergyState {
  if (!value.trim()) return ''
  if (value === UNKNOWN_PROFILE_VALUE) return 'unknown'
  if (value === NO_KNOWN_ALLERGIES || value.trim().toLowerCase() === 'ninguna') return 'none'
  return 'known'
}
export class ProfileInputError extends Error {}
export function parsePatientProfile(body: unknown, now = new Date()) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new ProfileInputError('Verifica la información enviada.')
  const data = body as Record<string, unknown>
  for (const key of ['dateOfBirth', 'bloodType', 'allergies']) {
    if (!Object.hasOwn(data, key) || typeof data[key] !== 'string') throw new ProfileInputError('Faltan campos del formulario. Recarga la página antes de guardar.')
  }
  const dateOfBirth = (data.dateOfBirth as string).trim()
  const bloodType = (data.bloodType as string).trim()
  let allergies = (data.allergies as string).trim()
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Puerto_Rico', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
  if (dateOfBirth && (!validDateOnly(dateOfBirth) || dateOfBirth > today || dateOfBirth < '1850-01-01')) throw new ProfileInputError('Verifica la fecha de nacimiento; no puede ser una fecha futura.')
  if (bloodType && !['O+','O-','A+','A-','B+','B-','AB+','AB-', UNKNOWN_PROFILE_VALUE].includes(bloodType)) throw new ProfileInputError('Selecciona un tipo de sangre válido o «No lo sé».')
  if (allergies.length > 2000) throw new ProfileInputError('La información de alergias no puede superar 2,000 caracteres.')
  if (data.allergyState !== undefined) {
    if (typeof data.allergyState !== 'string' || !['known', 'none', 'unknown'].includes(data.allergyState)) throw new ProfileInputError('Selecciona una opción para las alergias.')
    if (data.allergyState === 'known' && !allergies) throw new ProfileInputError('Escribe las alergias que conoces.')
    if (data.allergyState === 'none') allergies = NO_KNOWN_ALLERGIES
    if (data.allergyState === 'unknown') allergies = UNKNOWN_PROFILE_VALUE
  }
  return { dateOfBirth: dateOfBirth ? new Date(dateOfBirth + 'T00:00:00Z') : null, bloodType: bloodType || null, allergies: allergies || null }
}
