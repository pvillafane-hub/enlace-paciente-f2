import { beforeEach, expect, it, vi } from 'vitest'
const blob = vi.hoisted(() => ({ put: vi.fn(), get: vi.fn(), del: vi.fn() }))
vi.mock('@vercel/blob', () => blob)
import { putDocument, readDocument, removeDocument } from '@/lib/document-storage'
const key = 'documents/12345678-1234-1234-1234-123456789abc'
beforeEach(() => vi.clearAllMocks())
it('uploads only private immutable objects without patient names', async () => {
  const body = Buffer.from('%PDF-test')
  await putDocument(key, body, 'application/pdf')
  expect(blob.put).toHaveBeenCalledWith(key, body, { access: 'private', contentType: 'application/pdf', addRandomSuffix: false, allowOverwrite: false })
})
it('reads private objects without using the SDK read cache', async () => {
  await readDocument(key)
  expect(blob.get).toHaveBeenCalledWith(key, { access: 'private', useCache: false })
})
it('never interprets an external URL or legacy S3 key as a Blob location', async () => {
  await expect(readDocument('https://example.test/patient.pdf')).rejects.toThrow()
  await expect(putDocument('legacy/patient.pdf', Buffer.from('x'), 'application/pdf')).rejects.toThrow()
  expect(blob.get).not.toHaveBeenCalled()
  expect(blob.put).not.toHaveBeenCalled()
})
it('compensation deletes the exact newly created key', async () => {
  await removeDocument(key)
  expect(blob.del).toHaveBeenCalledWith(key)
})
