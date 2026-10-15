export const IDENTITY_HOLD_MESSAGE = 'Necesitamos validar tu identidad para completar el registro. Nuestro equipo se comunicará contigo.'
export function normalizedName(name: string) {
  return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').trim().split(/\s+/).sort().join(' ')
}
export function normalizedPhone(phone: string) {
  const digits = phone.replace(/[^0-9]/g, '')
  return digits.length === 10 ? '1' + digits : digits
}
export function possibleIdentityMatch(a: { fullName: string; contactPhone: string | null }, b: { fullName: string; contactPhone: string | null }) {
  return normalizedName(a.fullName) === normalizedName(b.fullName) || Boolean(a.contactPhone && b.contactPhone && normalizedPhone(a.contactPhone) === normalizedPhone(b.contactPhone))
}
