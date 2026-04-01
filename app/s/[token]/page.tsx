export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { s3 } from '@/lib/s3'

let prisma: any

async function getPrisma() {
  if (!prisma) {
    const { PrismaClient } = await import('@prisma/client')
    prisma = new PrismaClient()
  }
  return prisma
}

function MessagePage({
  title,
  message,
}: {
  title: string
  message: string
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
      <div className="bg-white rounded-2xl shadow-md p-10 max-w-md w-full text-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">
          {title}
        </h1>

        <p className="text-gray-600 text-lg leading-relaxed">
          {message}
        </p>

        <div className="mt-6">
          <a
            href="/"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-xl text-lg font-semibold hover:bg-blue-700 transition"
          >
            Enlace Salud
          </a>
        </div>
      </div>
    </div>
  )
}

export default async function SharedDocumentPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {

  const db = await getPrisma()

  // 🔥 FIX Next 16
  const { token } = await params

  if (!token) {
    return (
      <MessagePage
        title="🔐 Enlace inválido"
        message="El enlace no contiene información válida."
      />
    )
  }

  const share = await db.shareLink.findUnique({
    where: { token },
    include: { document: true },
  })

  // 🔐 1️⃣ Token no existe
  if (!share) {
    return (
      <MessagePage
        title="🔐 Enlace no válido"
        message="Este enlace no existe o no está disponible. Verifique que la dirección sea correcta o solicite un nuevo enlace."
      />
    )
  }

  // ⏳ 2️⃣ Token expirado
  if (share.expiresAt < new Date()) {
    return (
      <MessagePage
        title="🔒 Este enlace ha expirado"
        message="El acceso a este documento ha expirado por motivos de seguridad. Solicite un nuevo enlace a la persona que lo compartió."
      />
    )
  }

  // 📁 3️⃣ Documento eliminado
  if (!share.document) {
    return (
      <MessagePage
        title="📄 Documento no disponible"
        message="El documento asociado a este enlace ya no está disponible."
      />
    )
  }

  // ✅ 4️⃣ Generar signed URL y redirigir
  const key = share.document.filePath

  const command = new GetObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME!,
    Key: key,
  })

  const signedUrl = await getSignedUrl(s3, command, {
    expiresIn: 60,
  })

  redirect(signedUrl)
}