import { expect, it } from 'vitest'
import { reportActivity, inactivityLabel } from '../src/lib/report-view'
it('report browser payload strips password hashes and unnecessary medical data', () => {
  const document = {
    id: 'document', docType: 'Laboratorio', specialty: null, bodyPart: null,
    createdAt: new Date('2026-10-08T12:00:00Z'), filePath: 'private-object',
    user: { fullName: 'Synthetic patient', passwordHash: 'must-not-leak', allergies: 'private', email: 'private@example.test' },
  }
  expect(reportActivity(document)).toEqual({ id: 'document', docType: 'Laboratorio', specialty: null, bodyPart: null, createdAt: '2026-10-08T12:00:00.000Z', user: { fullName: 'Synthetic patient' } })
})
it('missing document date is never reported as years of inactivity', () => {
  expect(inactivityLabel(null)).toBe('Sin documentos registrados')
  expect(inactivityLabel(30)).toContain('30 días')
  expect(inactivityLabel(365)).toContain('Más de 1 año')
})
