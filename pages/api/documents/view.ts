import type { NextApiRequest, NextApiResponse } from "next"
import { prisma } from "@/lib/prisma"
import { s3 } from "@/lib/s3"
import { GetObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Método no permitido" })
  }

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
      where: { id: sessionId }
    })

    if (!session || session.expiresAt < new Date()) {
      return res.status(401).json({ error: "Sesión inválida o expirada" })
    }

    // 🔴 FIX CRÍTICO: asegurar userId como string
    if (!session.userId) {
      return res.status(401).json({ error: "Sesión inválida (sin usuario)" })
    }

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

    if (!document) {
      return res.status(404).json({ error: "Documento no encontrado" })
    }

    // 🔐 VALIDAR userId del documento
    if (!document.userId) {
      return res.status(500).json({
        error: "Documento inválido (sin usuario asociado)",
      })
    }

    // 🔐 VALIDAR ACCESO
    const isOwner = document.userId === userId

    if (!isOwner) {
      const relation = await prisma.doctorPatient.findFirst({
        where: {
          doctorId: userId,
          patientId: document.userId
        }
      })

      if (!relation) {
        console.warn("ACCESS DENIED:", {
          userId,
          documentId: id,
        })

        return res.status(403).json({ error: "Acceso denegado" })
      }
    }

    // ☁️ GENERAR SIGNED URL
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: document.filePath
    })

    const signedUrl = await getSignedUrl(s3, command, {
      expiresIn: 60 // ⏱️ 1 minuto
    })

    console.log("DOCUMENT VIEW:", {
      userId,
      documentId: id,
    })

    // 🔄 REDIRECT
    return res.redirect(signedUrl)

  } catch (error) {

    console.error("VIEW DOCUMENT ERROR:", error)

    return res.status(500).json({
      error: "Error al acceder al documento. Intente nuevamente.",
    })
  }
}