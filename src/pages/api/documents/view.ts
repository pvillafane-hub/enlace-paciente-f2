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
    return res.status(405).json({ error: "Method not allowed" })
  }

  try {

    // 🔐 1️⃣ Validar sesión

    const sessionId = req.cookies.pp_session

    if (!sessionId) {
      return res.status(401).json({ error: "Unauthorized - No session" })
    }

    const session = await prisma.session.findUnique({
      where: { id: sessionId }
    })

    if (!session || session.expiresAt < new Date()) {
      return res.status(401).json({ error: "Invalid or expired session" })
    }

    // 📄 2️⃣ Obtener ID del documento

    let id = req.query.id

    if (Array.isArray(id)) {
      id = id[0]
    }

    if (!id) {
      return res.status(400).json({ error: "Document ID required" })
    }

    // 📄 3️⃣ Buscar documento

    const document = await prisma.document.findUnique({
      where: { id }
    })

    if (!document) {
      return res.status(404).json({ error: "Document not found" })
    }

    // 👤 4️⃣ Validar acceso

    const isOwner = document.userId === session.userId

    if (!isOwner) {

      // verificar relación doctor-paciente

      const relation = await prisma.doctorPatient.findFirst({
        where: {
          doctorId: session.userId,
          patientId: document.userId
        }
      })

      if (!relation) {
        return res.status(403).json({ error: "Access denied" })
      }

    }

    // ☁️ 5️⃣ Generar Signed URL

    const command = new GetObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME!,
      Key: document.filePath
    })

    const signedUrl = await getSignedUrl(s3, command, {
      expiresIn: 60
    })

    return res.status(200).json({ url: signedUrl })

  } catch (error) {

    console.error("VIEW DOCUMENT ERROR:", error)

    return res.status(500).json({ error: "Internal Server Error" })

  }
}