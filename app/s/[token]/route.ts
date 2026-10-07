import { prisma } from '@/lib/prisma'
import { readDocument } from '@/lib/document-storage'

export const dynamic = 'force-dynamic'
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const headers = { 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer' }
  const { token } = await params
  if (!token || token.length > 256) return new Response('Enlace inválido', { status: 404, headers })
  const share = await prisma.shareLink.findUnique({ where: { token }, include: { document: { include: { user: { select: { active: true } } } } } })
  if (!share || share.expiresAt <= new Date() || share.document.deletedAt || !share.document.user.active) return new Response('Enlace expirado o documento no disponible', { status: 404, headers })
  try {
    const file = await readDocument(share.document.filePath)
    if (!file || file.statusCode !== 200) return new Response('Documento no disponible', { status: 404, headers })
    return new Response(file.stream, { headers: { ...headers, 'Content-Type': file.blob.contentType || 'application/octet-stream', 'Content-Disposition': 'inline' } })
  } catch {
    console.error('SHARED_DOCUMENT_READ_FAILED')
    return new Response('No se pudo acceder al documento', { status: 503, headers })
  }
}
