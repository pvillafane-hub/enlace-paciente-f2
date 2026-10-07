export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import ShareClient from './share-client'
import { prisma as db } from '@/lib/prisma'
import { getValidatedSession } from '@/lib/auth'

export default async function SharePage() {
  const session = await getValidatedSession()
  if (!session) redirect('/login')

  const userId = session.userId

  const documents = await db.document.findMany({
    where: {
      userId: userId,
      deletedAt: null,
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