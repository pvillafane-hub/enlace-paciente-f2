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

const awsMock = vi.hoisted(() => ({ send: vi.fn() }))
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: class { send = awsMock.send },
  PutObjectCommand: class { constructor(public input: unknown) {} },
  GetObjectCommand: class { constructor(public input: unknown) {} },
  DeleteObjectCommand: class { constructor(public input: unknown) {} },
  NoSuchKey: class extends Error {},
}))
import { afterEach } from 'vitest'
import { documentStorageKey } from '@/lib/document-storage'
afterEach(() => vi.unstubAllEnvs())
function configureS3() {
  vi.stubEnv('DOCUMENT_STORAGE_PROVIDER', 's3')
  vi.stubEnv('AWS_REGION', 'us-east-2'); vi.stubEnv('AWS_BUCKET_NAME', 'synthetic-test-bucket')
  vi.stubEnv('AWS_ACCESS_KEY_ID', 'synthetic-key'); vi.stubEnv('AWS_SECRET_ACCESS_KEY', 'synthetic-secret')
}
it('new S3 objects use an isolated namespace and cannot overwrite objects', async () => {
  configureS3()
  const location = documentStorageKey('12345678-1234-1234-1234-123456789abc')
  expect(location).toBe('s3:enlace-salud-mejoras/' + key)
  await putDocument(location, Buffer.from('test'), 'application/pdf')
  expect(awsMock.send).toHaveBeenCalledWith(expect.objectContaining({ input: expect.objectContaining({ Key: 'enlace-salud-mejoras/' + key, IfNoneMatch: '*', ServerSideEncryption: 'AES256' }) }))
})
it('switching upload provider does not reroute old Blob documents to S3', async () => {
  configureS3(); awsMock.send.mockClear()
  await readDocument(key)
  expect(blob.get).toHaveBeenCalledWith(key, { access: 'private', useCache: false })
  expect(awsMock.send).not.toHaveBeenCalled()
})
it('S3 read returns a stream for the same authenticated application routes', async () => {
  configureS3()
  const stream = new ReadableStream()
  awsMock.send.mockResolvedValue({ Body: { transformToWebStream: () => stream }, ContentType: 'application/pdf' })
  const file = await readDocument('s3:enlace-salud-mejoras/' + key)
  expect(file?.stream).toBe(stream)
  expect(file?.blob.contentType).toBe('application/pdf')
})
it('rejects S3 references outside the independent app namespace', async () => {
  configureS3(); awsMock.send.mockClear()
  await expect(readDocument('s3:documents/original-patient.pdf')).rejects.toThrow()
  await expect(removeDocument('s3:enlace-salud-mejoras/../original.pdf')).rejects.toThrow()
  expect(awsMock.send).not.toHaveBeenCalled()
})
it('S3 failures are not hidden by falling back to a different provider', async () => {
  configureS3(); awsMock.send.mockRejectedValueOnce(new Error('AccessDenied'))
  blob.get.mockClear()
  await expect(readDocument('s3:enlace-salud-mejoras/' + key)).rejects.toThrow('AccessDenied')
  expect(blob.get).not.toHaveBeenCalled()
})
