import { expect, it } from 'vitest'
import { syntheticReportHtml } from '../src/lib/interop/report-html'

const report = 'SOLO PRUEBAS — SIN VALIDEZ CLÍNICA\nPaciente ficticio: TestUser\nNacimiento verificado: 2018-04-12\nEmitido: 2026-10-28T12:00:00Z\n\n718-7: 12.4 g/dL'
it('renders a mobile-readable result while preserving original values and dates', () => {
  const html = syntheticReportHtml(report)
  expect(html).toContain('name="viewport" content="width=device-width, initial-scale=1"')
  expect(html).toContain('<strong>12.4 g/dL</strong>')
  expect(html).toContain('04/12/2018')
  expect(html).toContain('28 de octubre de 2026')
  expect(html).toContain('SOLO PRUEBAS — SIN VALIDEZ CLÍNICA')
  expect(html).toContain(report)
})
it('escapes patient, source and observation content, with no active script or remote resources', () => {
  const html = syntheticReportHtml('SOLO PRUEBAS\nPaciente ficticio: <img src=x onerror=alert(1)>\nFuente: </dd><script>alert(2)</script>\n\n<svg/onload=alert(3)>: "<unsafe>" & value')
  expect(html).not.toContain('<script>')
  expect(html).not.toContain('<img')
  expect(html).not.toContain('<svg')
  expect(html).toContain('&lt;img')
  expect(html).toContain('&quot;&lt;unsafe&gt;&quot; &amp; value')
  expect(html).not.toMatch(/https?:\/\//)
})
it('handles a report without observations', () => {
  expect(syntheticReportHtml('SOLO PRUEBAS\nPaciente ficticio: TestUser')).toContain('No hay valores disponibles.')
})
