import { put, get, del } from '@vercel/blob'
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, NoSuchKey } from '@aws-sdk/client-s3'

const blobKey = /^documents\/[0-9a-f-]{36}$/
const s3Key = /^s3:enlace-salud-mejoras\/documents\/[0-9a-f-]{36}$/

export function documentStorageKey(id: string) {
  const provider = process.env.DOCUMENT_STORAGE_PROVIDER || 'blob'
  if (provider !== 'blob' && provider !== 's3') throw new Error('Invalid document storage provider')
  const key = provider === 's3' ? `s3:enlace-salud-mejoras/documents/${id}` : `documents/${id}`
  checkKey(key)
  return key
}

function checkKey(key: string) {
  if (!blobKey.test(key) && !s3Key.test(key)) throw new Error('Unsupported storage key')
}

function aws() {
  const region = process.env.AWS_REGION, bucket = process.env.AWS_BUCKET_NAME
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID, secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY
  if (!region || !bucket || !accessKeyId || !secretAccessKey) throw new Error('S3 storage configuration is incomplete')
  return { bucket, client: new S3Client({ region, credentials: { accessKeyId, secretAccessKey, ...(process.env.AWS_SESSION_TOKEN ? { sessionToken: process.env.AWS_SESSION_TOKEN } : {}) } }) }
}

export async function putDocument(key: string, body: Buffer, contentType: string) {
  checkKey(key)
  if (blobKey.test(key)) return put(key, body, { access: 'private', contentType, addRandomSuffix: false, allowOverwrite: false })
  const { client, bucket } = aws()
  return client.send(new PutObjectCommand({ Bucket: bucket, Key: key.slice(3), Body: body, ContentType: contentType, IfNoneMatch: '*', ServerSideEncryption: 'AES256', CacheControl: 'private, no-store' }))
}

export async function readDocument(key: string) {
  checkKey(key)
  if (blobKey.test(key)) return get(key, { access: 'private', useCache: false })
  const { client, bucket } = aws()
  try {
    const object = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key.slice(3) }))
    if (!object.Body) return null
    return { statusCode: 200 as const, stream: object.Body.transformToWebStream(), blob: { contentType: object.ContentType || 'application/octet-stream' } }
  } catch (error) {
    if (error instanceof NoSuchKey) return null
    throw error
  }
}

export async function removeDocument(key: string) {
  checkKey(key)
  if (blobKey.test(key)) return del(key)
  const { client, bucket } = aws()
  return client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key.slice(3) }))
}
