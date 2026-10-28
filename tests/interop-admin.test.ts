import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, expect, it, vi } from 'vitest'
const m = vi.hoisted(() => ({ admin: vi.fn(), list: vi.fn() }))
vi.mock('@/lib/admin-session', () => ({ requireActiveAdmin: m.admin }))
vi.mock('@/lib/prisma', () => ({ prisma: { interopSandboxReceipt: { findMany: m.list } } }))
import { adminInteropReceipts, interopFilter, safeResultSummary } from '../src/lib/interop/admin-view'
import Page from '../app/dashboard/admin/interoperability/page'
beforeEach(() => {
  vi.stubGlobal('React', React)
  vi.resetAllMocks(); m.admin.mockResolvedValue({ id: 'admin' }); m.list.mockResolvedValue([])
  vi.stubEnv('INTEROP_SANDBOX_ENABLED', 'true'); vi.stubEnv('ENLACE_ISOLATED_ENVIRONMENT', 'true'); vi.stubEnv('VERCEL_ENV', 'preview')
  vi.stubEnv('INTEROP_SANDBOX_TOKEN', 'a'.repeat(40)); vi.stubEnv('INTEROP_SANDBOX_SOURCE', 'TEST-LAB')
})
it('requires active Admin before reading integration receipts', async () => {
  m.admin.mockRejectedValue(new Error('Unauthorized'))
  await expect(Page({ searchParams: Promise.resolve({}) })).rejects.toThrow('Unauthorized')
  expect(m.list).not.toHaveBeenCalled()
})
it('shows disabled state in production without querying nonexistent tables', async () => {
  vi.stubEnv('VERCEL_ENV', 'production')
  const html = renderToStaticMarkup(await Page({ searchParams: Promise.resolve({}) }))
  expect(html).toContain('Recepción de pruebas deshabilitada'); expect(m.list).not.toHaveBeenCalled()
  expect(html).not.toContain('No hay recibos')
})
it('does not expose credentials or query until configuration is complete', async () => {
  vi.stubEnv('INTEROP_SANDBOX_TOKEN', '')
  const html = renderToStaticMarkup(await Page({ searchParams: Promise.resolve({}) }))
  expect(html).toContain('Configuración de pruebas incompleta'); expect(m.list).not.toHaveBeenCalled()
})
it('bounds and scopes pending queries and rejects arbitrary filters', async () => {
  expect(interopFilter('PENDING_REVIEW')).toBe('PENDING_REVIEW'); expect(interopFilter('INVALID')).toBe('ALL')
  await adminInteropReceipts('PENDING_REVIEW')
  expect(m.list).toHaveBeenCalledWith(expect.objectContaining({ where: { source: 'TEST-LAB', status: 'PENDING_REVIEW' }, take: 50 }))
})
it('separates an empty inbox from storage failure without leaking diagnostics', async () => {
  const empty = renderToStaticMarkup(await Page({ searchParams: Promise.resolve({}) }))
  expect(empty).toContain('No hay recibos para este filtro')
  m.list.mockRejectedValue(new Error('database-password-detail'))
  const failed = renderToStaticMarkup(await Page({ searchParams: Promise.resolve({}) }))
  expect(failed).toContain('Bandeja temporalmente no disponible'); expect(failed).not.toContain('database-password-detail'); expect(failed).not.toContain('No hay recibos')
})
it('renders pending identities and retry/conflict events as text without approval actions', async () => {
  m.list.mockResolvedValue([{ id: 'r1', source: 'TEST-LAB', reportId: '<script>alert(1)</script>', status: 'PENDING_REVIEW', format: 'fhir-r4', createdAt: new Date('2026-10-28T12:00:00Z'), normalized: { patientId: 'TEST-UNKNOWN', birthDate: '2018-04-13', testCode: '718-7', issued: '2026-10-28T12:00:00Z' }, events: [{ id: 'e1', action: 'CONFLICT_REJECTED', createdAt: new Date() }, { id: 'e2', action: 'DUPLICATE_RECEIVED', createdAt: new Date() }] }])
  const html = renderToStaticMarkup(await Page({ searchParams: Promise.resolve({ status: 'PENDING_REVIEW' }) }))
  expect(html).toContain('TEST-UNKNOWN'); expect(html).toContain('Reenvío con cambios rechazado'); expect(html).toContain('Reenvío idéntico reconocido')
  expect(html).not.toContain('<script>'); expect(html).not.toContain('<form'); expect(html).not.toContain('a'.repeat(40))
  expect(html).toContain('no se asignó a un expediente')
})
it('handles unexpected stored JSON without rendering arbitrary structures', () => {
  expect(safeResultSummary(null)).toBeNull(); expect(safeResultSummary([])).toBeNull()
  expect(safeResultSummary({ patientId: {} })?.patientId).toBe('No disponible')
})
