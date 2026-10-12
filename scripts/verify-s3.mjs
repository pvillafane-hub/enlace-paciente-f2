import { randomUUID } from 'node:crypto'
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'

if (process.env.VERIFY_S3_STORAGE !== 'true') process.exit(0)
if (process.env.VERCEL_PROJECT_ID !== 'prj_E14yVB1Az8RWvAmpkQ9hO0Z1ESJC' || process.env.ENLACE_ISOLATED_ENVIRONMENT !== 'true' || process.env.DOCUMENT_STORAGE_PROVIDER !== 's3') {
  console.error('S3 verification blocked: independent project only.'); process.exit(1)
}
const bucket = process.env.AWS_BUCKET_NAME, region = process.env.AWS_REGION
if (!bucket || !region || !process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
  console.error('S3 verification failed: configuration incomplete.'); process.exit(1)
}
const client = new S3Client({ region, credentials: {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  ...(process.env.AWS_SESSION_TOKEN ? { sessionToken: process.env.AWS_SESSION_TOKEN } : {}),
} })
const key = `enlace-salud-mejoras/documents/${randomUUID()}`
const body = Buffer.from('Enlace Salud synthetic storage verification. No patient data.')
let written = false, failed = false
try {
  await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: 'text/plain', ServerSideEncryption: 'AES256', IfNoneMatch: '*' }))
  written = true
  const object = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }))
  if (!object.Body || !Buffer.from(await object.Body.transformToByteArray()).equals(body)) throw new Error('READ_MISMATCH')
  if (!object.ServerSideEncryption) throw new Error('ENCRYPTION_MISSING')
  const anonymous = await fetch(`https://${bucket}.s3.${region}.amazonaws.com/${key}`, { method: 'GET', redirect: 'error', signal: AbortSignal.timeout(15000) })
  await anonymous.body?.cancel()
  if (![403, 404].includes(anonymous.status)) throw new Error('ANONYMOUS_ACCESS_NOT_DENIED')
  console.log('S3_VERIFY_WRITE_READ_PRIVATE_OK')
} catch (error) {
  failed = true
  console.error('S3_VERIFY_FAILED', { name: error?.name || 'Unknown', status: error?.$metadata?.httpStatusCode || null })
} finally {
  if (written) {
    try {
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }))
      console.log('S3_VERIFY_CLEANUP_OK')
    } catch { failed = true; console.error('S3_VERIFY_CLEANUP_FAILED', { key }) }
  }
  client.destroy()
}
if (failed) process.exit(1)
