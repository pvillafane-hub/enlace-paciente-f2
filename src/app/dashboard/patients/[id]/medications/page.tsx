import { prisma } from "@/lib/prisma"
import { getValidatedSession } from "@/lib/auth"
import { redirect } from "next/navigation"

export default async function MedicationsPage({
  params
}: {
  params: Promise<{ id: string }>
}) {

  const session = await getValidatedSession()

  if (!session) {
    redirect("/")
  }

  // 🔥 FIX CLAVE
  const { id: patientId } = await params

  if (!patientId) {
    redirect("/dashboard")
  }

  const patient = await prisma.user.findUnique({
    where: { id: patientId },
    include: { documents: true }
  })

  if (!patient) {
    redirect("/dashboard")
  }

  const meds = patient.documents.filter(
    (doc) => doc.docType === "Medicamentos"
  )

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      <h1 className="text-2xl font-bold">
        💊 Medicamentos de {patient.fullName}
      </h1>

      {meds.length === 0 && (
        <p className="text-gray-500">
          No hay medicamentos registrados.
        </p>
      )}

      <div className="grid md:grid-cols-3 gap-4">

        {meds.map((m) => (

          <a
            key={m.id}
            href={`/api/documents/view?id=${m.id}`}
            target="_blank"
            className="block bg-gray-50 rounded-lg p-3 hover:shadow transition"
          >

            <div className="aspect-square bg-gray-200 rounded mb-2 flex items-center justify-center">
              📷
            </div>

            <p className="text-sm font-semibold">
              {m.filename}
            </p>

            <p className="text-xs text-gray-500">
              {m.studyDate}
            </p>

          </a>

        ))}

      </div>

    </div>
  )
}