/** Read a small JSON request body without buffering an unbounded upload. */
export class RequestBodyTooLargeError extends Error {
  constructor() { super('PAYLOAD_TOO_LARGE') }
}

export async function readBoundedJson(request: Request, maxBytes = 4096): Promise<unknown> {
  if (!request.body) throw new SyntaxError('EMPTY_BODY')
  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > maxBytes) throw new RequestBodyTooLargeError()
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }
  const bytes = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  const raw = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  return JSON.parse(raw)
}
