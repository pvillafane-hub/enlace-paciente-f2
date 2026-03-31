import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import formidable from 'formidable'
import { PutObjectCommand } from "@aws-sdk/client-s3"
import { s3 } from "@/lib/s3"
import { randomUUID } from "crypto"
import fs from "fs"
import path from "path"

export const config = {
  api: {
    bodyParser: false,
  },
}

const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
]

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

// 🧠 Helper: normalizar fields
function getFieldValue(field: any): string {
  if (Array.isArray(field)) return field[0] ?? ""
  return field ?? ""
}

// 🧠 Helper: limpiar strings
function clean(value: string): string {
  return value?.trim() || ""
}

// 🧠 Helper: filename seguro
function getSafeFilename(file: formidable.File): string {
  const originalName =
    typeof file.originalFilename === "string"
      ? file.originalFilename
      : typeof file.newFilename === "string"
      ? file.newFilename
      : "archivo"

  return path
    .basename(originalName)
    .replace(/[^a-zA-Z0-9.\-_]/g, "_")
}

// 🧠 Helper: borrar archivo sin romper
function safeUnlink(filePath: string) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }
  } catch (err) {
    console.warn("No se pudo borrar archivo temporal:", err)
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {

  if (req.method === "OPTIONS") {
    return res.status(200).end()
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" })
  }

  let tempFilePath: string | null = null

  try {

    // 🔐 VALIDAR ENV
    const bucketName = process.env.AWS_BUCKET_NAME
    if (!bucketName) {
      throw new Error("AWS_BUCKET_NAME no configurado")
    }

    // 🔐 VALIDAR SESIÓN
    const sessionId = req.cookies.pp_session

    if (!sessionId) {
      return res.status(401).json({ error: "Sesión no encontrada" })
    }

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    })

    if (!session || session.expiresAt < new Date()) {
      return res.status(401).json({ error: "Sesión inválida o expirada" })
    }

    // 🔴 FIX CRÍTICO (TypeScript + seguridad)
    if (!session.userId) {
      return res.status(401).json({
        error: "Sesión inválida (sin usuario)",
      })
    }

    const userId = session.userId

    // 📂 FORM PARSE
    const form = formidable({
      multiples: false,
      keepExtensions: true,
      maxFileSize: MAX_FILE_SIZE,
    })

    const [fields, files] = await form.parse(req)

    const file = Array.isArray(files.file)
      ? files.file[0]
      : files.file

    if (!file) {
      return res.status(400).json({ error: "Debe subir un archivo" })
    }

    tempFilePath = file.filepath

    // 🔍 VALIDAR TIPO
    if (!ALLOWED_TYPES.includes(file.mimetype || "")) {
      safeUnlink(tempFilePath)
      return res.status(400).json({
        error: "Formato no permitido. Solo PDF, JPG o PNG.",
      })
    }

    // 🔍 VALIDAR TAMAÑO
    if (file.size && file.size > MAX_FILE_SIZE) {
      safeUnlink(tempFilePath)
      return res.status(400).json({
        error: "El archivo excede el tamaño máximo de 10MB.",
      })
    }

    // 🧼 FILENAME SEGURO
    const safeFilename = getSafeFilename(file)

    // 📝 CAMPOS
    const docType = clean(getFieldValue(fields.docType))
    const facility = clean(getFieldValue(fields.facility))
    const studyDate = clean(getFieldValue(fields.studyDate))

    if (!facility || !studyDate) {
      safeUnlink(tempFilePath)
      return res.status(400).json({
        error: "Debe completar todos los campos requeridos.",
      })
    }

    // 📂 LEER ARCHIVO
    const fileBuffer = fs.readFileSync(tempFilePath)

    const finalDocType = docType || "Otro"

    const key = `${userId}/${randomUUID()}-${safeFilename}`

    // ☁️ SUBIR A S3
    await s3.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: fileBuffer,
        ContentType: file.mimetype || "application/octet-stream",
      })
    )

    // 🗄️ GUARDAR EN DB
    const document = await prisma.document.create({
      data: {
        userId,
        filename: safeFilename,
        filePath: key,
        docType: finalDocType,
        facility,
        studyDate,
      },
    })

    // 🧹 LIMPIAR
    safeUnlink(tempFilePath)

    console.log("UPLOAD SUCCESS:", {
      userId,
      filename: safeFilename,
      size: file.size,
    })

    return res.status(200).json(document)

  } catch (error) {

    if (tempFilePath) {
      safeUnlink(tempFilePath)
    }

    console.error("UPLOAD CREATE ERROR:", error)

    return res.status(500).json({
      error: "Ocurrió un error subiendo el documento. Intente nuevamente.",
    })
  }
}