import { put, get, del } from '@vercel/blob'

function checkKey(key: string) {
  if (!/^documents\/[0-9a-f-]{36}$/.test(key)) throw new Error('Unsupported storage key; legacy S3 objects require a separate migration')
}

export async function putDocument(key: string, body: Buffer, contentType: string) {
  checkKey(key)
  return put(key, body, { access: 'private', contentType, addRandomSuffix: false, allowOverwrite: false })
}

export async function readDocument(key: string) {
  checkKey(key)
  return get(key, { access: 'private', useCache: false })
}

export async function removeDocument(key: string) {
  checkKey(key)
  return del(key)
}
