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

  if (!session?.userId) {
    redirect('/?auth=required')
  }

  const doctorId = session.userId
  const { id: patientId } = await params

  if (!patientId) {
    redirect('/dashboard')
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId }
  })

  if (!user) {
    redirect('/dashboard')
  }

  const isDemo = user.email === "doctor_demo@enlace.com"

  if (!isDemo) {
    const access = await prisma.doctorPatient.findFirst({
      where: { doctorId, patientId }
    })

    if (!access) {
      redirect('/dashboard')
    }

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
  }

  let patient

  if (isDemo) {

    if (patientId === "1") {
      patient = {
        id: "1",
        fullName: "Juan Pérez",
        email: "juan@email.com",
        active: true,
        dateOfBirth: new Date("1958-03-12"),
        bloodType: "O+",
        allergies: "Penicilina",
        documents: [
          {
            id: "doc1",
            filename: "Radiografía de tórax",
            docType: "Radiografía",
            facility: "Hospital San Pablo",
            studyDate: new Date(),
            createdAt: new Date(),
            filePath: "/demo/docs/radiografia.jpg",
            userId: "demo",
            deletedAt: null,
          }
        ]
      }
    }

    else if (patientId === "2") {
      patient = {
        id: "2",
        fullName: "María del Carmen",
        email: "maria@email.com",
        active: true,
        dateOfBirth: new Date("1949-07-22"),
        bloodType: "A+",
        allergies: "Aspirina",
        documents: [
          {
            id: "doc2",
            filename: "Laboratorio clínico",
            docType: "Laboratorio",
            facility: "Laboratorio Clínico PR",
            studyDate: new Date(),
            createdAt: new Date(),
            filePath: "/demo/docs/laboratorio-maria-del-carmen.jpg",
            userId: "demo",
            deletedAt: null,
          }
        ]
      }
    }

    else {
      patient = {
        id: "3",
        fullName: "Ana Vélez",
        email: "ana@email.com",
        active: true,
        dateOfBirth: null,
        bloodType: null,
        allergies: null,
        documents: []
      }
    }
  }

  else {
    const realPatient = await prisma.user.findUnique({
      where: { id: patientId },
      include: {
        documents: {
          orderBy: { studyDate: 'desc' }
        }
      }
    })

    if (!realPatient) {
      redirect('/dashboard')
    }

    patient = {
      ...realPatient,
      documents: realPatient.documents.map(doc => ({
        ...doc,
        studyDate: new Date(doc.studyDate),
        deletedAt: null
      }))
    }
  }

  if (!isDemo && !patient.active) {
    redirect('/dashboard')
  }

  const meds = patient.documents.filter(
    (doc: any) => doc.docType === "Medicamentos"
  )

  const latestDoc = patient.documents?.[0]

  return (

    <div className="max-w-5xl mx-auto space-y-8">

      {/* HEADER */}
      <div className="bg-white rounded-xl p-6 shadow-sm border">

        <div className="flex justify-between items-start">

          <div>
            <h1 className="text-3xl font-bold">{patient.fullName}</h1>
            <p className="text-gray-500 mt-1">{patient.email}</p>

            {latestDoc && (
              <p className="text-sm text-gray-500 mt-2">
                Última actividad ·{" "}
                {new Date(latestDoc.studyDate).toLocaleDateString('es-PR')}
              </p>
            )}
          </div>

          {latestDoc && (
            <a
              href={`/api/documents/view?id=${latestDoc.id}`}
              target="_blank"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
            >
              Ver último estudio
            </a>
          )}

        </div>

      </div>

      {/* INFO */}
      <div className="bg-white rounded-xl p-6 shadow-sm border">
        <h2 className="text-xl font-semibold mb-4">Información del paciente</h2>

        <div className="grid md:grid-cols-3 gap-4">

          <div className="bg-blue-50 p-4 rounded-xl">
            <p className="text-sm text-gray-500">Fecha de nacimiento</p>
            <p className="text-lg font-semibold">
              {patient.dateOfBirth
                ? new Date(patient.dateOfBirth).toLocaleDateString('es-PR')
                : "No registrada"}
            </p>
          </div>

          <div className="bg-red-50 p-4 rounded-xl">
            <p className="text-sm text-gray-500">Tipo de sangre</p>
            <p className="text-lg font-semibold">{patient.bloodType || "No registrado"}</p>
          </div>

          <div className={`p-4 rounded-xl ${
            patient.allergies
              ? "bg-red-100 border-2 border-red-400"
              : "bg-gray-50 border border-gray-200"
          }`}>
            <p className="text-sm text-gray-500">Alergias</p>
            <p className="text-lg font-semibold">
              {patient.allergies || "No registradas"}
            </p>
          </div>

        </div>
      </div>

      {/* MEDICAMENTOS */}
      <div className="bg-white rounded-xl p-6 shadow-sm border">
        <h2 className="text-xl font-semibold mb-4">Medicamentos</h2>

        {meds.length > 0 ? (
          <div className="space-y-3">
            {meds.map((doc: any) => (
              <div
                key={doc.id}
                className="flex justify-between items-center border rounded-lg p-3"
              >
                <div>
                  <p className="font-medium">{doc.filename}</p>
                  <p className="text-sm text-gray-500">
                    {doc.facility || "Sin origen"}
                  </p>
                </div>

                <a
                  href={`/api/documents/view?id=${doc.id}`}
                  target="_blank"
                  className="bg-blue-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-blue-700"
                >
                  Ver
                </a>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">
            No hay medicación registrada.
          </p>
        )}
      </div>

      {/* HISTORIAL */}
      <div className="bg-white rounded-xl p-6 shadow-sm border">
        <h2 className="text-xl font-semibold mb-6">Historial médico</h2>

        <DocumentSearch
          documents={patient.documents.map(doc => ({
            ...doc,
            studyDate:
              doc.studyDate instanceof Date
                ? doc.studyDate.toISOString()
                : doc.studyDate
          }))}
        />
      </div>

    </div>
  )
}