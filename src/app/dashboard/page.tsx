import Link from "next/link"
import DashboardView from "./DashboardView"
import { prisma } from "@/lib/prisma"
import { getValidatedSession } from "@/lib/auth"

export const dynamic = "force-dynamic";

export default async function Dashboard() {

  const session = await getValidatedSession()

  if (!session) {
    return null
  }

  const userData = await prisma.user.findUnique({
    where: { id: session.userId },
    include: {
      documents: true
    }
  })

  if (!userData) return null

  // 🔐 Verificar si tiene passkey
  const passkey = await prisma.authMethod.findFirst({
    where: { userId: session.userId }
  })

  const passkeyEnabled = Boolean(passkey)

  // Convertir studyDate a Date para TypeScript
  const user = {
    ...userData,
    documents: userData.documents.map(doc => ({
      ...doc,
      studyDate: new Date(doc.studyDate)
    }))
  }

  return (
    <div className="space-y-10">

      {/* PANEL DEL PACIENTE */}
      <DashboardView user={user} passkeyEnabled={passkeyEnabled} />

      {/* ACCIONES RÁPIDAS */}
      <div className="max-w-5xl mx-auto mt-14">

        <h2 className="text-2xl font-semibold mb-2">
          Acciones rápidas
        </h2>

        <p className="text-gray-600 text-lg mb-8">
          Usa estas opciones para gestionar tus estudios médicos.
        </p>

        <div className="grid gap-6 md:grid-cols-2">

          <DashboardCard
            href="/dashboard/upload"
            icon="📤"
            title="Subir estudio médico"
            description="Laboratorios, radiografías o estudios clínicos"
          />

          <DashboardCard
            href="/dashboard/share"
            icon="👨‍⚕️"
            title="Enviar estudio a mi médico"
            description="Comparte tus estudios con tu doctor o familiar"
          />

        </div>

      </div>

    </div>
  )
}

function DashboardCard({
  href,
  icon,
  title,
  description,
}: {
  href: string
  icon: string
  title: string
  description: string
}) {
  return (
    <Link
      href={href}
      className="bg-white border rounded-3xl p-8 hover:shadow-lg transition text-center block"
    >

      <div className="text-5xl mb-4">
        {icon}
      </div>

      <h3 className="text-xl font-semibold mb-2">
        {title}
      </h3>

      <p className="text-gray-600 text-lg">
        {description}
      </p>

    </Link>
  )
}