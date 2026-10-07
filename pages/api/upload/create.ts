import type { NextApiRequest, NextApiResponse } from 'next'
import formidable, { type Fields, type Files } from 'formidable'
import { readFile, unlink } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { prisma } from '@/lib/prisma'
import { putDocument, removeDocument } from '@/lib/document-storage'
import { getApiSession } from '@/lib/api-auth'
import { canReadPatient } from '@/lib/access'
import { MAX_UPLOAD_BYTES, detectDocumentType, validDateOnly } from '@/lib/file-policy'

export const config = { api: { bodyParser: false } }

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' })
  const session = await getApiSession(req.cookies.pp_session)
  if (!session) return res.status(401).json({ error: 'No autorizado' })
  const paths = new Set<string>()
  const form = formidable({ multiples: false, maxFiles: 1, maxFileSize: MAX_UPLOAD_BYTES, maxTotalFileSize: MAX_UPLOAD_BYTES, maxFields: 10, maxFieldsSize: 8192, allowEmptyFiles: false })
  form.on('fileBegin', (_name, file) => paths.add(file.filepath))
  try {
    let parsed: [Fields, Files]
    try { parsed = await form.parse(req) }
    catch { return res.status(400).json({ error: 'Archivo inválido; el máximo es 4 MB' }) }
    const [fields, files] = parsed
    const value = (key: string) => fields[key]?.[0]?.trim() ?? ''
    const patientId = value('patientId') || session.userId
    if (!await canReadPatient(session.user, patientId)) return res.status(403).json({ error: 'Acceso denegado' })
    const docType = value('docType'), facility = value('facility'), studyDate = value('studyDate')
    const bodyPart = value('bodyPart').toLowerCase(), specialty = value('specialty').toLowerCase()
    if (!docType || docType.length > 80 || !facility || facility.length > 200 || !validDateOnly(studyDate)) return res.status(400).json({ error: 'Verifique tipo, institución y fecha del estudio' })
    if (['radiografia', 'imagenes'].includes(docType.toLowerCase()) && !['cabeza','cuello','pecho','abdomen','extremidades'].includes(bodyPart)) return res.status(400).json({ error: 'Seleccione una parte del cuerpo válida' })
    if (docType.toLowerCase() === 'laboratorio' && !['cardiologia','endocrinologia','nefrologia','hematologia_oncologia','urologia','reumatologia','neumologia','geriatria','pediatria'].includes(specialty)) return res.status(400).json({ error: 'Seleccione una especialidad válida' })
    const file = files.file?.[0]
    if (!file || Object.keys(files).length !== 1 || file.size > MAX_UPLOAD_BYTES) return res.status(400).json({ error: 'Seleccione un único archivo de hasta 4 MB' })
    const bytes = await readFile(file.filepath)
    const contentType = detectDocumentType(bytes)
    if (!contentType || bytes.length > MAX_UPLOAD_BYTES) return res.status(400).json({ error: 'Solo PDF, JPEG, PNG y WebP' })
    const key = `documents/${randomUUID()}`
    const filename = (file.originalFilename || 'documento').replace(/[\x00-\x1f\x7f/\\]/g, '_').slice(0, 180)
    await putDocument(key, bytes, contentType)
    try {
      const document = await prisma.$transaction(async tx => {
        const created = await tx.document.create({ data: { userId: patientId, docType, facility, studyDate, filename, filePath: key, bodyPart: bodyPart || null, specialty: specialty || null } })
        await tx.auditLog.create({ data: { userId: session.userId, action: 'DOCUMENT_UPLOADED', entityId: created.id } })
        return created
      })
      return res.status(200).json({ success: true, document, uploadedForUserId: patientId })
    } catch {
      try { await removeDocument(key) }
      catch { console.error('UPLOAD_COMPENSATION_FAILED', { objectKey: key }) }
      throw new Error('Document persistence failed')
    }
  } catch { console.error('UPLOAD_FAILED'); return res.status(500).json({ error: 'No se pudo guardar el documento' }) }
  finally { await Promise.allSettled(Array.from(paths).map(path => unlink(path))) }
}
