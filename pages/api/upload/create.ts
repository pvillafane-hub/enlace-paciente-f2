import type { NextApiRequest, NextApiResponse } from 'next'
import formidable from 'formidable'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import fs from 'fs'
import { prisma } from '@/lib/prisma'
import { parse } from "cookie"

export const config = {
  api: {
    bodyParser: false,
  },
}

const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' })
  }

  const form = formidable({ multiples: false })

  form.parse(req, async (err, fields, files) => {

    try {

      if (err) {
        console.error(err)
        return res.status(500).json({ error: 'Error procesando archivo' })
      }

      // 🔐 SESSION
      const cookies = parse(req.headers.cookie || "")
      const sessionId = cookies.pp_session

      const session = await prisma.session.findUnique({
        where: { id: sessionId },
      })

      if (!session?.userId) {
        return res.status(401).json({ error: "No autorizado" })
      }

      // 🔹 NORMALIZAR CAMPOS
      const getValue = (f: any) => Array.isArray(f) ? f[0] : f

      const docType = getValue(fields.docType)
      const facility = getValue(fields.facility)
      const studyDate = getValue(fields.studyDate)
      const bodyPart = getValue(fields.bodyPart)
      const specialty = getValue(fields.specialty) // 🔥 NUEVO

      const normalizedDocType = docType?.toLowerCase()
      const normalizedBodyPart = bodyPart?.toLowerCase().trim()
      const normalizedSpecialty = specialty?.toLowerCase().trim()

      // 🔹 VALIDACIÓN CLÍNICA

      const isImaging =
        normalizedDocType === "radiografia" ||
        normalizedDocType === "imagenes"

      const isLab =
        normalizedDocType === "laboratorio"

      const allowedBodyParts = [
        "cabeza",
        "cuello",
        "pecho",
        "abdomen",
        "extremidades",
      ]

      const allowedSpecialties = [
        "cardiologia",
        "endocrinologia",
        "nefrologia",
        "hematologia_oncologia",
        "urologia",
        "reumatologia",
        "neumologia",
        "geriatria",
        "pediatria",
      ]

      if (
        isImaging &&
        (!normalizedBodyPart ||
          !allowedBodyParts.includes(normalizedBodyPart))
      ) {
        return res.status(400).json({
          error: "Debe seleccionar una opción válida del cuerpo",
        })
      }

      if (
        isLab &&
        (!normalizedSpecialty ||
          !allowedSpecialties.includes(normalizedSpecialty))
      ) {
        return res.status(400).json({
          error: "Debe seleccionar una especialidad válida",
        })
      }

      // 📁 ARCHIVO
      const file = Array.isArray(files.file) ? files.file[0] : files.file

      if (!file) {
        return res.status(400).json({ error: 'Archivo requerido' })
      }

      const fileStream = fs.createReadStream(file.filepath)
      const fileKey = `documents/${Date.now()}-${file.originalFilename}`

      const bucket = process.env.AWS_BUCKET_NAME

      if (!bucket) {
        throw new Error("AWS_BUCKET_NAME no está definido")
      }

      // 🔥 S3 UPLOAD
      await s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: fileKey,
          Body: fileStream,
          ContentType: file.mimetype || 'application/octet-stream',
        })
      )

      // 💾 DB
      const document = await prisma.document.create({
        data: {
          userId: session.userId,
          docType: docType as string,
          facility: facility as string,
          studyDate: studyDate as string,
          filename: file.originalFilename || 'documento',
          filePath: fileKey,
          bodyPart: normalizedBodyPart || null,
          specialty: normalizedSpecialty || null, // 🔥 FIX CLAVE
        },
      })

      return res.status(200).json({ success: true, document })

    } catch (error) {

      console.error("UPLOAD ERROR:", error)

      return res.status(500).json({
        error: 'Error interno del servidor',
      })
    }

  })
}