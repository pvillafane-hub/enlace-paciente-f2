type LicenseState = { status: string; plan?: string | null; validUntil?: Date | null }
export function hasActiveLicense(license: LicenseState | null | undefined, now = new Date()) {
  return Boolean(license?.status === 'ACTIVE' && (!license.validUntil || license.validUntil > now))
}
export function isPro(license: LicenseState | null | undefined, now = new Date()) {
  return hasActiveLicense(license, now) && license?.plan === 'PRO'
}

export function licenseAccess(licenses: (LicenseState & { createdAt?: Date })[], now = new Date()) {
  const active = licenses.some(license => hasActiveLicense(license, now))
  // Legacy inactive licenses without an end date have no provable paid cutoff.
  const ends = licenses.flatMap(license => license.validUntil && (license.status === 'ACTIVE' || license.validUntil <= now) ? [Math.min(license.validUntil.getTime(), now.getTime())] : [])
  const cutoff = active ? null : new Date(ends.length ? Math.max(...ends) : 0)
  return { active, cutoff, documentWhere: cutoff ? { createdAt: { lt: cutoff } } : {} }
}
