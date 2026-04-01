import DocumentSearch from '@/components/DocumentSearch'
import { prisma } from '@/lib/prisma'
import { getValidatedSession } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function PatientPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {

  const session = await getValidatedSession()

  // ✅ FIX CRÍTICO
  if (!session?.userId) {
    redirect('/?auth=required')
  }

  const doctorId = session.userId
  const { id: patientId } = await params

  if (!patientId) {
    redirect('/dashboard')
  }

  const access = await prisma.doctorPatient.findFirst({
    where: {
      doctorId,
      patientId
    }
  })

  if (!access) {
    redirect('/dashboard')
  }

  // 🔥 RESOLVER ALERTAS AUTOMÁTICAMENTE
  await prisma.medicalAlert.updateMany({
    where: {
      doctorId,
      patientId,
      resolved: false
    },
    data: {
      resolved: true,
      resolvedAt: new Date()
    }
  })

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
    redirect('/dashboard')
  }

  if (!patient.active) {
    redirect('/dashboard')
  }

  // 🔥 VACUNAS
  const vaccines = patient.documents.filter(
    doc => doc.docType === "Vacunas"
  )

  // 🔥 MEDICAMENTOS
  const meds = patient.documents.filter(
    doc => doc.docType === "Medicamentos"
  )

  // ------------------------------
  // Timeline
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

      {/* Encabezado */}
      <div className="bg-white rounded-xl p-6 shadow-sm border">
        <h1 className="text-3xl font-bold">
          {patient.fullName}
        </h1>

        <p className="text-gray-500 mt-2">
          {patient.email}
        </p>
      </div>

      {/* INFO CLÍNICA */}
      <div className="bg-white rounded-xl p-6 shadow-sm border">
        <h2 className="text-xl font-semibold mb-4">
          Información del paciente
        </h2>

        <div className="grid md:grid-cols-3 gap-4">

          <div className="bg-blue-50 p-4 rounded-xl">
            <p className="text-gray-500 text-sm">Fecha de nacimiento</p>
            <p className="text-lg font-semibold">
              {patient.dateOfBirth
                ? new Date(patient.dateOfBirth).toLocaleDateString('es-PR')
                : "No registrada"}
            </p>
          </div>

          <div className="bg-red-50 p-4 rounded-xl">
            <p className="text-gray-500 text-sm">Tipo de sangre</p>
            <p className="text-lg font-semibold">
              {patient.bloodType || "No registrado"}
            </p>
          </div>

          <div className="bg-yellow-50 p-4 rounded-xl">
            <p className="text-gray-500 text-sm">Alergias</p>
            <p className="text-lg font-semibold">
              {patient.allergies || "Ninguna registrada"}
            </p>
          </div>

        </div>
      </div>

      {/* 💉 VACUNAS */}
      {vaccines.length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-sm border">

          <h2 className="text-xl font-semibold mb-4">
            💉 Vacunas del paciente
          </h2>

          <div className="space-y-3">

            {vaccines.map(v => (
              <div
                key={v.id}
                className="flex justify-between items-center bg-blue-50 p-4 rounded-lg hover:bg-blue-100 transition"
              >
                <div>
                  <p className="font-semibold">{v.filename}</p>
                  <p className="text-sm text-gray-500">
                    {v.facility}
                  </p>
                  <p className="text-xs text-gray-400">
                    {v.studyDate}
                  </p>
                </div>

                <a
                  href={`/api/documents/view?id=${v.id}`}
                  target="_blank"
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                >
                  Ver
                </a>

              </div>
            ))}

          </div>
        </div>
      )}

      {/* 💊 MEDICAMENTOS */}
      {meds.length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-sm border flex justify-between items-center">

          <div>
            <p className="font-semibold text-lg">
              💊 Medicamentos del paciente
            </p>
            <p className="text-sm text-gray-500">
              {meds.length} documento(s) disponibles
            </p>
          </div>

          <a
            href={`/dashboard/patients/${patient.id}/medications`}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            Ver
          </a>

        </div>
      )}

      {/* HISTORIAL */}
      <div className="bg-white rounded-xl p-6 shadow-sm border">

        <h2 className="text-xl font-semibold mb-6">
          Historial médico
        </h2>

        <div className="mb-10">
          <DocumentSearch documents={patient.documents} />
        </div>

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