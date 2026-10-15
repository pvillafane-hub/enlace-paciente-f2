import { expect, it } from 'vitest'
import { normalizedName, normalizedPhone, possibleIdentityMatch } from '../src/lib/identity-policy'
import { isSessionUsable } from '../src/lib/session-policy'
it('normalizes accents, spacing, punctuation and reordered names without changing stored names', () => {
  expect(normalizedName('José  Rivera-López')).toBe(normalizedName('Lopez Rivera Jose'))
  expect(normalizedPhone('(787) 555-1234')).toBe('17875551234')
})
it('flags same normalized name, or shared phone when birth is matched by the caller', () => {
  expect(possibleIdentityMatch({ fullName: 'Jose Rivera', contactPhone: null }, { fullName: 'José Rivera', contactPhone: null })).toBe(true)
  expect(possibleIdentityMatch({ fullName: 'Ana', contactPhone: '7875551234' }, { fullName: 'Maria', contactPhone: '+1 787 555 1234' })).toBe(true)
  expect(possibleIdentityMatch({ fullName: 'Ana', contactPhone: null }, { fullName: 'Maria', contactPhone: null })).toBe(false)
})
it.each(['HOLD','DUPLICATE'])('denies sessions for %s even if someone sets active true', identityStatus => {
  const now = new Date(); expect(isSessionUsable({ userId: 'test', createdAt: new Date(now.getTime()-1000), expiresAt: new Date(now.getTime()+10000) }, { active: true, passwordChangedAt: null, identityStatus }, now)).toBe(false)
})
