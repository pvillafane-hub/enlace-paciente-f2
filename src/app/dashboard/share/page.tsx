export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import ShareClient from './share-client'
import { cookies } from 'next/headers'

let prisma: any

async function getPrisma() {
  if (!prisma) {
    const { PrismaClient } = await import('@prisma/client')
    prisma = new PrismaClient()
  }
  return prisma
}

export default async function SharePage() {
  const cookieStore = cookies()
  const sessionId = cookieStore.get('pp_session')?.value

  if (!sessionId) redirect('/login')

  const db = await getPrisma()

  const session = await db.session.findUnique({
    where: { id: sessionId },
  })

  if (!session || session.expiresAt < new Date()) {
    redirect('/login')
  }

  const documents = await db.document.findMany({
    where: {
      userId: session.userId,
    },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white/90 backdrop-blur rounded-2xl p-8 shadow-sm">
        <h2 className="text-3xl font-bold mb-8">
          Compartir documento
        </h2>

        {documents.length === 0 ? (
          <p className="text-xl text-gray-500">
            No tienes documentos para compartir.
          </p>
        ) : (
          <ShareClient documents={documents} />
        )}
      </div>
    </div>
  )
}