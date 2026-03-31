import { prisma } from "@/lib/prisma"
import { getValidatedSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import ShareClient from "../share-client"

export default async function ShareDocumentPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {

  // 🔐 Validar sesión
  const session = await getValidatedSession()

  if (!session) {
    redirect("/?auth=required")
  }

  // 🔥 FIX Next 16
  const { id } = await params

  if (!id) {
    redirect("/dashboard")
  }

  const doc = await prisma.document.findUnique({
    where: { id },
  })

  if (!doc) {
    return (
      <div className="p-10 text-center">
        Documento no encontrado
      </div>
    )
  }

  // 🔐 Seguridad: solo dueño puede compartir
  if (doc.userId !== session.userId) {
    redirect("/dashboard")
  }

  const document = {
    id: doc.id,
    filename: doc.filename,
    filePath: doc.filePath,
    docType: doc.docType,
    facility: doc.facility,
    studyDate: doc.studyDate.toString(),
    createdAt: doc.createdAt.toString(),
  }

  return (
    <ShareClient documents={[document]} />
  )
}