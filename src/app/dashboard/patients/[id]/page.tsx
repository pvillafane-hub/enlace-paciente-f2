import DocumentSearch from '@/components/DocumentSearch'
import { prisma } from '@/lib/prisma'
import { getValidatedSession } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function PatientPage({ params }: { params: { id: string } }) {

  const session = await getValidatedSession()

  if (!session) {
    redirect('/?auth=required')
  }

  const doctorId = session.userId
  const patientId = params.id

  // Verificar acceso doctor → paciente

  const access = await prisma.doctorPatient.findFirst({
    where: {
      doctorId,
      patientId
    }
  })

  if (!access) {
    return (
      <div className="max-w-5xl mx-auto">
        <p className="text-red-600">
          No tienes acceso a este paciente.
        </p>
      </div>
    )
  }

  const patient = await prisma.user.findUnique({
    where: { id: patientId },
    include: {
      documents: {
        orderBy: {
          studyDate: 'desc'
        }
      }
    }
  })

  if (!patient) {
    return (
      <div className="max-w-5xl mx-auto">
        <p>Paciente no encontrado</p>
      </div>
    )
  }

  // ------------------------------
  // Construir Timeline clínico
  // ------------------------------

  const timeline: Record<string, typeof patient.documents> = {}

  for (const doc of patient.documents) {

    const year = new Date(doc.studyDate).getFullYear().toString()

    if (!timeline[year]) {
      timeline[year] = []
    }

    timeline[year].push(doc)
  }

  const years = Object.keys(timeline).sort((a, b) => Number(b) - Number(a))

  return (

    <div className="max-w-5xl mx-auto space-y-8">

      {/* Encabezado paciente */}

      <div className="bg-white rounded-xl p-6 shadow-sm border">

        <h1 className="text-3xl font-bold">
          {patient.fullName}
        </h1>

        <p className="text-gray-500 mt-2">
          {patient.email}
        </p>

      </div>


      {/* Historial clínico */}

      <div className="bg-white rounded-xl p-6 shadow-sm border">

        <h2 className="text-xl font-semibold mb-6">
          Historial médico
        </h2>


        {/* 🔎 Buscador clínico */}

        <div className="mb-10">
          <DocumentSearch documents={patient.documents} />
        </div>


        {/* Timeline */}

        {patient.documents.length === 0 && (
          <p className="text-gray-500">
            Este paciente no tiene documentos.
          </p>
        )}

        <div className="space-y-10">

          {years.map((year) => (

            <div key={year}>

              <h3 className="text-lg font-bold text-gray-700 mb-4">
                {year}
              </h3>

              <div className="border-l-2 border-blue-200 pl-6 space-y-4">

                {timeline[year].map((doc) => (

                  <div
                    key={doc.id}
                    className="flex justify-between items-center bg-gray-50 p-4 rounded-lg hover:bg-gray-100 transition"
                  >

                    <div>

                      <p className="font-semibold">
                        {doc.filename}
                      </p>

                      <p className="text-sm text-gray-500">
                        {doc.docType} · {doc.facility}
                      </p>

                      <p className="text-xs text-gray-400">
                        {doc.studyDate}
                      </p>

                    </div>

                    <a
                      href={`/api/documents/view?id=${doc.id}`}
                      target="_blank"
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                    >
                      Ver
                    </a>

                  </div>

                ))}

              </div>

            </div>

          ))}

        </div>

      </div>

    </div>
  )
}