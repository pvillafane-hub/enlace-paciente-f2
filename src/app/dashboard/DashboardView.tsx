import EntrarFacilButton from "@/components/EntrarFacilButton";

interface Document {
  id: string;
  filename: string;
  docType: string;
  facility: string;
  studyDate: Date;
  createdAt: Date;
}

interface DashboardViewProps {
  user: {
    id: string;
    email: string;
    fullName: string;
    createdAt: Date;
    documents: Document[];
  };
  passkeyEnabled: boolean;
}

export default function DashboardView({ user, passkeyEnabled }: DashboardViewProps) {

  const sortedDocuments = [...user.documents].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const latestDocument = sortedDocuments[0];

  const documentsByYear = sortedDocuments.reduce((groups, doc) => {
    const year = new Date(doc.studyDate).getFullYear();

    if (!groups[year]) {
      groups[year] = [];
    }

    groups[year].push(doc);

    return groups;
  }, {} as Record<number, Document[]>);

  function getIcon(type: string) {
    const t = type.toLowerCase();

    if (t.includes("laboratorio")) return "🧪";
    if (t.includes("radi")) return "🩻";
    if (t.includes("receta")) return "💊";

    return "📄";
  }

  function getColor(type: string) {
    const t = type.toLowerCase();

    if (t.includes("laboratorio")) return "bg-green-100 text-green-700";
    if (t.includes("radi")) return "bg-blue-100 text-blue-700";
    if (t.includes("receta")) return "bg-orange-100 text-orange-700";

    return "bg-gray-100 text-gray-700";
  }

  return (
    <div className="min-h-screen bg-gray-50 px-6 py-10">

      {/* HEADER */}
      <div className="max-w-5xl mx-auto bg-white rounded-3xl shadow-soft p-10">

        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-6">

          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-blue-700">
              Bienvenido, {user.fullName}
            </h1>

            <p className="text-gray-600 mt-2 text-lg">
              {user.email}
            </p>

            <p className="text-gray-500 text-sm mt-1">
              Miembro desde {new Date(user.createdAt).toLocaleDateString()}
            </p>
          </div>

          <a
            href="/dashboard/upload"
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-4 rounded-2xl text-xl font-semibold transition text-center"
          >
            + Subir documento
          </a>
        </div>

        {/* 🔐 ENTRAR FÁCIL */}
        <div className="mt-10">

          {passkeyEnabled ? (

            <div className="bg-green-50 border border-green-300 rounded-xl p-5 text-center">

              <p className="text-green-800 font-semibold text-lg">
                ✔ Entrar Fácil activado
              </p>

              <p className="text-green-700 mt-2 text-sm">
                Puedes acceder con huella digital o reconocimiento facial.
              </p>

            </div>

          ) : (

            <EntrarFacilButton />

          )}

        </div>

      </div>


      {/* ÚLTIMO ESTUDIO */}
      {latestDocument && (
        <div className="max-w-5xl mx-auto mt-10 bg-white rounded-3xl shadow-soft p-8 border-l-8 border-blue-600">

          <h2 className="text-2xl font-bold mb-4">
            Tu último estudio médico
          </h2>

          <div className={`inline-block px-3 py-1 rounded-lg text-lg font-semibold ${getColor(latestDocument.docType)}`}>
            {getIcon(latestDocument.docType)} {latestDocument.docType}
          </div>

          <p className="text-gray-600 mt-3">
            <strong>Institución:</strong> {latestDocument.facility}
          </p>

          <p className="text-gray-600">
            <strong>Fecha:</strong>{" "}
            {new Date(latestDocument.studyDate).toLocaleDateString()}
          </p>

          <div className="pt-4 flex gap-3 flex-wrap">

            <a
              href={`/dashboard/view/S${latestDocument.id}`}
              className="bg-gray-100 hover:bg-gray-200 px-4 py-3 rounded-lg text-lg"
            >
              Ver estudio
            </a>

            <a
              href={`/dashboard/share/${latestDocument.id}`}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg text-lg"
            >
              Enviar a mi médico
            </a>

          </div>

        </div>
      )}


      {/* HISTORIAL */}
      <div className="max-w-5xl mx-auto mt-10">

        <h2 className="text-2xl font-semibold">
          Historial de estudios médicos
        </h2>

        <p className="text-gray-600 mt-2 text-lg">
          Cada color representa el tipo de estudio médico.
        </p>

        <div className="flex flex-wrap gap-4 mt-3 mb-4 text-lg">

          <div className="bg-green-100 text-green-700 px-3 py-1 rounded-lg font-semibold">
            🧪 Laboratorio
          </div>

          <div className="bg-blue-100 text-blue-700 px-3 py-1 rounded-lg font-semibold">
            🩻 Radiografía
          </div>

          <div className="bg-orange-100 text-orange-700 px-3 py-1 rounded-lg font-semibold">
            💊 Receta
          </div>

        </div>

        <p className="text-gray-500 mb-6">
          {sortedDocuments.length} estudios registrados
        </p>


        {sortedDocuments.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 shadow-soft text-center text-gray-500 text-lg">
            No tienes documentos cargados todavía.
          </div>
        ) : (

          Object.entries(documentsByYear).map(([year, docs]) => (

            <div key={year} className="mb-10">

              <h3 className="text-xl font-bold text-gray-700 mb-4">
                {year}
              </h3>

              <div className="grid md:grid-cols-2 gap-6">

                {docs.map((doc) => (

                  <div
                    key={doc.id}
                    className="bg-white rounded-2xl p-6 shadow-soft space-y-2"
                  >

                    <div className={`inline-block px-3 py-1 rounded-lg text-lg font-semibold ${getColor(doc.docType)}`}>
                      {getIcon(doc.docType)} {doc.docType}
                    </div>

                    <p className="text-gray-600">
                      <strong>Institución:</strong> {doc.facility}
                    </p>

                    <p className="text-gray-600">
                      <strong>Fecha:</strong>{" "}
                      {new Date(doc.studyDate).toLocaleDateString()}
                    </p>

                    <div className="pt-4 flex flex-wrap gap-3">

                      <a
                        href={`/view/${doc.id}`}
                        className="bg-gray-100 hover:bg-gray-200 px-4 py-3 rounded-lg text-lg"
                      >
                        Ver estudio
                      </a>

                      <a
                        href={`/share/${doc.id}`}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg text-lg"
                      >
                        Enviar a mi médico
                      </a>

                    </div>

                  </div>

                ))}

              </div>

            </div>

          ))

        )}

      </div>
    </div>
  );
}