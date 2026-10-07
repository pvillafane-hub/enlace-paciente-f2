type LicenseState = { status: string; plan?: string | null; validUntil?: Date | null }
export function hasActiveLicense(license: LicenseState | null | undefined, now = new Date()) {
  return Boolean(license?.status === 'ACTIVE' && (!license.validUntil || license.validUntil > now))
}
export function isPro(license: LicenseState | null | undefined, now = new Date()) {
  return hasActiveLicense(license, now) && license?.plan === 'PRO'
}
