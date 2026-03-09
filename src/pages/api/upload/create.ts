
import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import formidable from 'formidable'
import { PutObjectCommand } from "@aws-sdk/client-s3"
import { s3 } from "@/lib/s3"
import { randomUUID } from "crypto"
import fs from "fs"
import { detectDocumentType } from "@/lib/documentClassifier"

// necesario para formidable
export const config = {
  api: {
    bodyParser: false,
  },
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {

  console.log("REQUEST METHOD:", req.method)

  // permitir preflight (CORS)
  if (req.method === "OPTIONS") {
    return res.status(200).end()
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  try {

    // validar sesión
    const sessionId = req.cookies.pp_session

    if (!sessionId) {
      return res.status(401).json({ error: "Unauthorized - No session" })
    }

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    })

    if (!session || session.expiresAt < new Date()) {
      return res.status(401).json({ error: "Invalid or expired session" })
    }

    const userId = session.userId

    // procesar form
    const form = formidable({
      multiples: false,
      keepExtensions: true,
       maxFileSize: 10 * 1024 * 1024, // 10MB
    })
    

    const [fields, files] = await form.parse(req)

    console.log("FIELDS:", fields)

    const file = Array.isArray(files.file)
      ? files.file[0]
      : files.file

    if (!file) {
      return res.status(400).json({ error: "File is required" })
    }

    const filename = file.originalFilename || file.newFilename

    const docTypeRaw = fields.docType
    const facilityRaw = fields.facility
    const studyDateRaw = fields.studyDate

    const docType = Array.isArray(docTypeRaw)
      ? docTypeRaw[0]
      : docTypeRaw || ""

    const facility = Array.isArray(facilityRaw)
      ? facilityRaw[0]
      : facilityRaw || ""

    const studyDate = Array.isArray(studyDateRaw)
      ? studyDateRaw[0]
      : studyDateRaw || ""

    if (!facility || !studyDate) {
      return res.status(400).json({ error: "Missing required fields" })
    }

    const fileBuffer = fs.readFileSync(file.filepath)

    let detectedType = docType || "Otro"

    const finalDocType = docType || detectedType || "Otro"

    console.log("FINAL DOC TYPE:", finalDocType)

    const key = `${userId}/${randomUUID()}-${filename}`

    // subir a S3
    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: key,
        Body: fileBuffer,
        ContentType: file.mimetype || "application/octet-stream",
      })
    )

    // guardar en DB
    const document = await prisma.document.create({
      data: {
        userId,
        filename,
        filePath: key,
        docType: finalDocType,
        facility,
        studyDate,
      },
    })

    return res.status(200).json(document)

  } catch (error) {

    console.error("UPLOAD CREATE ERROR:", error)

    return res.status(500).json({ error: "Internal Server Error" })

  }
}