import { getLicenseAccess } from '@/lib/license-access'
import { canReadDocument } from '@/lib/guardian-access'
import { auditLog } from '@/lib/audit'
import { getApiSession } from '@/lib/api-auth'
import type { NextApiRequest, NextApiResponse } from "next"
import { prisma } from "@/lib/prisma"
import { readDocument } from '@/lib/document-storage'
import { Readable } from 'node:stream'
import { syntheticReportHtml } from '@/lib/interop/report-html'
import { syntheticDocumentText } from '@/lib/interop/delivery'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Método no permitido" })
  }

  try {

    // 🔐 VALIDAR SESIÓN
    const sessionId = req.cookies.pp_session

    if (!sessionId) {
      return res.status(401).json({ error: "Sesión no encontrada" })
    }

    const session = await getApiSession(sessionId)

    if (!session || session.expiresAt < new Date()) {
      return res.status(401).json({ error: "Sesión inválida o expirada" })
    }

    // 🔴 FIX CRÍTICO: asegurar userId como string
    if (!session.userId) {
      return res.status(401).json({ error: "Sesión inválida (sin usuario)" })
    }

    if (!(await getLicenseAccess(session.userId)).active) return res.status(403).json({ error: 'Necesitas una licencia activa para esta acción', code: 'LICENSE_REQUIRED' })
    const userId = session.userId

    // 📄 VALIDAR ID
    let id = req.query.id

    if (Array.isArray(id)) {
      id = id[0]
    }

    if (!id || typeof id !== "string") {
      return res.status(400).json({ error: "ID de documento inválido" })
    }

    // 📄 BUSCAR DOCUMENTO
    const document = await prisma.document.findUnique({
      where: { id }
    })

    if (!document || document.deletedAt) {
      return res.status(404).json({ error: "Documento no encontrado" })
    }

    // 🔐 VALIDAR userId del documento
    if (!document.userId) {
      return res.status(500).json({
        error: "Documento inválido (sin usuario asociado)",
      })
    }

    if (!await canReadDocument(session.user, document)) return res.status(403).json({ error: 'Acceso denegado' })

    if (document.filePath.startsWith('interop-sandbox:')) {
      const report = await syntheticDocumentText(document)
      if (!report) return res.status(404).json({ error: 'Resultado ficticio no disponible' })
      await auditLog({ userId, action: 'DOCUMENT_VIEW', entityId: id })
      res.setHeader('Cache-Control', 'private, no-store')
      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'")
      res.setHeader('Referrer-Policy', 'no-referrer')
      res.setHeader('X-Content-Type-Options', 'nosniff')
      return res.status(200).send(syntheticReportHtml(report))
    }
    const file = await readDocument(document.filePath)
    if (!file || file.statusCode !== 200) return res.status(404).json({ error: 'Documento no disponible' })
    await auditLog({ userId, action: 'DOCUMENT_VIEW', entityId: id })
    res.setHeader('Cache-Control', 'private, no-store')
    res.setHeader('Content-Type', file.blob.contentType || 'application/octet-stream')
    res.setHeader('Content-Disposition', 'inline')
    await new Promise<void>((resolve, reject) => {
      const stream = Readable.fromWeb(file.stream as never)
      stream.on('error', reject)
      res.on('finish', resolve)
      res.on('close', () => { stream.destroy(); resolve() })
      stream.pipe(res)
    })

  } catch (error) {

    console.error("VIEW_DOCUMENT_FAILED")

    return res.status(500).json({
      error: "Error al acceder al documento. Intente nuevamente.",
    })
  }
}
