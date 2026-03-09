import { prisma } from "@/lib/prisma"
import ShareClient from "../share-client"

export default async function ShareDocumentPage({
  params,
}: {
  params: { id: string }
}) {

  const doc = await prisma.document.findUnique({
    where: { id: params.id },
  })

  if (!doc) {
    return (
      <div className="p-10 text-center">
        Documento no encontrado
      </div>
    )
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