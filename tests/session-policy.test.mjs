import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isSessionUsable } from '../src/lib/session-policy.ts'

const now = new Date('2026-10-07T00:00:00Z')
const session = { userId: 'patient', createdAt: new Date(now.getTime() - 1000), expiresAt: new Date(now.getTime() + 1000) }
const user = { active: true, passwordChangedAt: null }
test('active authenticated session is accepted', () => assert.equal(isSessionUsable(session, user, now), true))
test('expired and boundary sessions are rejected', () => assert.equal(isSessionUsable({ ...session, expiresAt: now }, user, now), false))
test('disabled user is rejected', () => assert.equal(isSessionUsable(session, { ...user, active: false }, now), false))
test('password rotation revokes existing sessions', () => assert.equal(isSessionUsable(session, { ...user, passwordChangedAt: now }, now), false))
test('challenge-only session is rejected', () => assert.equal(isSessionUsable({ ...session, userId: null }, user, now), false))
test('missing session or user is rejected', () => { assert.equal(isSessionUsable(null, user, now), false); assert.equal(isSessionUsable(session, null, now), false) })
