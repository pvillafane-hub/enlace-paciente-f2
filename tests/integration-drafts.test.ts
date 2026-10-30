import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, expect, it, vi } from 'vitest'
const m = vi.hoisted(() => ({ admin: vi.fn(), transaction: vi.fn(), actor: vi.fn(), create: vi.fn(), update: vi.fn(), audit: vi.fn(), list: vi.fn(), count: vi.fn() }))
vi.mock('@/lib/admin-session', () => ({ requireActiveAdmin: m.admin }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/prisma', () => ({ prisma: { $transaction: m.transaction, interopIntegrationDraft: { findMany: m.list, count: m.count } } }))
import { integrationValues, preparationIssues } from '../src/lib/integrations/policy'
import { saveIntegration } from '../app/dashboard/admin/integrations/actions'
import Page from '../app/dashboard/admin/integrations/page'
function form(overrides: Record<string,string> = {}) {
  const data = new FormData()
  for (const [key, value] of Object.entries({ name: 'Laboratorio ficticio', code: 'TEST-LAB-02', protocol: 'FHIR_R4', direction: 'INBOUND', endpoint: '', authType: 'BEARER', credentialRef: '', reviewAll: 'on', notes: '', status: 'DRAFT', confirmed: 'on', ...overrides })) data.set(key,value)
  return data
}
beforeEach(() => {
  vi.resetAllMocks(); vi.stubGlobal('React',React)
  vi.stubEnv('VERCEL_ENV','preview'); vi.stubEnv('INTEROP_SANDBOX_ENABLED','true'); vi.stubEnv('ENLACE_ISOLATED_ENVIRONMENT','true'); vi.stubEnv('INTEROP_SANDBOX_TOKEN','a'.repeat(40)); vi.stubEnv('INTEROP_SANDBOX_SOURCE','TEST-LAB')
  m.admin.mockResolvedValue({ id: 'admin' }); m.actor.mockResolvedValue({ id: 'admin' }); m.create.mockResolvedValue({ id: 'draft' }); m.update.mockResolvedValue({ count: 1 }); m.list.mockResolvedValue([]); m.count.mockResolvedValue(0)
  m.transaction.mockImplementation(fn => fn({ user: { findFirst: m.actor }, interopIntegrationDraft: { create: m.create, updateMany: m.update }, auditLog: { create: m.audit } }))
})
it('requires an active admin before reading or writing configuration', async () => {
  m.admin.mockRejectedValue(new Error('Unauthorized'))
  await expect(saveIntegration(null,null,{},form())).rejects.toThrow('Unauthorized')
  await expect(Page({searchParams:Promise.resolve({})})).rejects.toThrow('Unauthorized')
  expect(m.transaction).not.toHaveBeenCalled(); expect(m.list).not.toHaveBeenCalled()
})
it('does not query drafts or mutate data in production', async () => {
  vi.stubEnv('VERCEL_ENV','production')
  expect((await saveIntegration(null,null,{},form())).error).toBeTruthy()
  const html = renderToStaticMarkup(await Page({searchParams:Promise.resolve({})}))
  expect(html).toContain('deshabilitada'); expect(m.transaction).not.toHaveBeenCalled(); expect(m.list).not.toHaveBeenCalled()
})
it.each(['ACTIVE','CONNECTED','VERIFIED'])('cannot save a misleading operational state: %s', status => {
  expect(() => integrationValues(form({ status }))).toThrow('borradores')
})
it.each(['http://lab.example/api','https://user:pass@lab.example/api','https://lab.example/api?token=value','https://lab.example/api#token'])('rejects insecure or credential-bearing URLs: %s', endpoint => {
  expect(() => integrationValues(form({endpoint}))).toThrow()
})
it('allows an incomplete draft, clearly identifying missing preparation data', () => {
  const value = integrationValues(form({direction:'OUTBOUND'}))
  expect(preparationIssues(value)).toHaveLength(2)
  expect(value.reviewAll).toBe(true)
  expect(() => integrationValues(form({ code:'CLINICAL-LAB' }))).toThrow('TEST-')
})
it('persists a draft with an audit entry, without touching receipts, credentials or activation', async () => {
  expect((await saveIntegration(null,null,{},form())).success).toContain('no está probada')
  expect(m.create).toHaveBeenCalledWith({data:expect.objectContaining({name:'Laboratorio ficticio',code:'TEST-LAB-02',protocol:'FHIR_R4',status:'DRAFT',credentialRef:null,createdById:'admin',updatedById:'admin'})})
  expect(m.audit).toHaveBeenCalledWith({data:expect.objectContaining({userId:'admin',action:'INTEGRATION_DRAFT_CREATED',metadata:expect.objectContaining({connectionTested:false})})})
})
it('requires confirmation, rechecks the actor and detects conflicting edits', async () => {
  expect((await saveIntegration(null,null,{},form({confirmed:''}))).error).toBeTruthy(); expect(m.transaction).not.toHaveBeenCalled()
  m.actor.mockResolvedValueOnce(null); expect((await saveIntegration(null,null,{},form())).error).toBeTruthy(); expect(m.create).not.toHaveBeenCalled()
  m.update.mockResolvedValueOnce({count:0}); expect((await saveIntegration('draft',1,{},form())).error).toContain('Otra persona'); expect(m.audit).not.toHaveBeenCalled()
})
it('can pause a draft with optimistic locking and records the change', async () => {
  expect((await saveIntegration('draft',2,{},form({status:'PAUSED'}))).success).toBeTruthy()
  expect(m.update).toHaveBeenCalledWith({where:{id:'draft',version:2},data:expect.objectContaining({status:'PAUSED',version:{increment:1}})})
})
it('reports a duplicate code without returning database internals', async () => {
  m.create.mockRejectedValue({code:'P2002',message:'database connection secret'})
  const result = await saveIntegration(null,null,{},form())
  expect(result.error).toContain('ya existe'); expect(result.error).not.toContain('secret')
})
it('escapes persisted labels and distinguishes data failure from an empty list', async () => {
  m.list.mockResolvedValue([{ id:'draft',version:1,name:'<script>alert(1)</script>',code:'TEST-LAB-02',protocol:'API_JSON',direction:'INBOUND',endpoint:null,authType:'BEARER',credentialRef:null,reviewAll:true,notes:null,status:'DRAFT',updatedAt:new Date('2026-10-30') }]); m.count.mockResolvedValue(1)
  const html = renderToStaticMarkup(await Page({searchParams:Promise.resolve({})}))
  expect(html).toContain('&lt;script&gt;'); expect(html).not.toContain('<script>alert(1)</script>'); expect(html).toContain('Sin probar')
  m.list.mockRejectedValue(new Error('offline'))
  expect(renderToStaticMarkup(await Page({searchParams:Promise.resolve({})}))).toContain('No se pudo consultar')
})

it('accepts credential references and rejects raw credential-like values', () => {
  expect(integrationValues(form({credentialRef:'env:LAB_TEST_TOKEN'})).credentialRef).toBe('env:LAB_TEST_TOKEN')
  expect(integrationValues(form({credentialRef:'secret:lab/pruebas'})).credentialRef).toBe('secret:lab/pruebas')
  expect(() => integrationValues(form({credentialRef:'a-long-token-that-is-not-a-reference'}))).toThrow('referencia')
})
