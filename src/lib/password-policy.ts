export const PASSWORD_ERROR = 'Use de 8 a 72 bytes, con mayúscula, minúscula, número y símbolo.'
export function validPassword(value: unknown): value is string {
  return typeof value === 'string' && value.length >= 8 && new TextEncoder().encode(value).length <= 72 &&
    /[A-Z]/.test(value) && /[a-z]/.test(value) && /[0-9]/.test(value) && /[^A-Za-z0-9]/.test(value)
}
