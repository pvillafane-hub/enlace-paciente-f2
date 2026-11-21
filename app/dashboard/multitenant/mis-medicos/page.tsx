import { redirect } from 'next/navigation'
import { getValidatedSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import AuthorizedDoctorsManager from '@/components/multitenant/AuthorizedDoctorsManager'

export const dynamic = 'force-dynamic'

/**
 * Isolated preview route for Multi-Tenant V1.
 * Do not add it to production navigation until migration and E2E validation.
 */
export default async function AuthorizedDoctorsPage() {
  const session = await getValidatedSession()
  if (!session) redirect('/login')

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { active: true, role: true },
  })
  if (!user?.active || user.role !== 'PATIENT') {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <h1 className="text-xl font-semibold">Acceso no disponible</h1>
        <p>Esta sección está disponible únicamente para pacientes autorizados.</p>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <AuthorizedDoctorsManager />
    </main>
  )
}
