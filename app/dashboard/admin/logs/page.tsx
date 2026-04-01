import { prisma } from "@/lib/prisma"
import { getValidatedSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Role } from "@prisma/client"

export default async function AdminLogsPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string
    from?: string
    to?: string
  }>
}) {

  const session = await getValidatedSession()

  if (!session) {
    redirect("/?auth=required")
  }

  // 🔥 FIX CRÍTICO
  if (!session.userId) {
    redirect("/?auth=required")
  }

  const userId = session.userId

  const user = await prisma.user.findUnique({
    where: { id: userId }
  })

  if (!user || user.role !== Role.ADMIN) {
    redirect("/dashboard")
  }

  // 🔥 FIX NEXT 16
  const { search, from, to } = await searchParams

  // 🔍 Filtros dinámicos
  const where: any = {}

  if (search) {
    where.user = {
      OR: [
        { email: { contains: search, mode: "insensitive" } },
        { fullName: { contains: search, mode: "insensitive" } },
      ],
    }
  }

  if (from || to) {
    where.createdAt = {}

    if (from) {
      where.createdAt.gte = new Date(from)
    }

    if (to) {
      where.createdAt.lte = new Date(to)
    }
  }

  const logs = await prisma.auditLog.findMany({
    where,
    include: {
      user: true
    },
    orderBy: {
      createdAt: "desc"
    },
    take: 100
  })

  return (
    <div className="space-y-6">

      <h1 className="text-2xl font-bold">
        Auditoría del Sistema
      </h1>

      {/* 🔥 EXPORT BUTTON */}
      <div className="flex justify-end">
        <a
          href={`/api/admin/logs/export?search=${search || ""}&from=${from || ""}&to=${to || ""}`}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          Exportar CSV
        </a>
      </div>

      {/* 🔍 FILTROS */}
      <form className="flex flex-wrap gap-4 bg-white p-4 rounded-lg border">

        <input
          type="text"
          name="search"
          placeholder="Buscar usuario..."
          defaultValue={search || ""}
          className="border px-3 py-2 rounded w-64"
        />

        <input
          type="date"
          name="from"
          defaultValue={from || ""}
          className="border px-3 py-2 rounded"
        />

        <input
          type="date"
          name="to"
          defaultValue={to || ""}
          className="border px-3 py-2 rounded"
        />

        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Filtrar
        </button>

        <a
          href="/dashboard/admin/logs"
          className="px-4 py-2 rounded border"
        >
          Limpiar
        </a>

      </form>

      {/* 📊 TABLA */}
      <div className="bg-white border rounded-lg overflow-hidden">

        <table className="w-full text-left">

          <thead className="border-b bg-gray-50">
            <tr>
              <th className="p-3">Usuario</th>
              <th className="p-3">Acción</th>
              <th className="p-3">Detalle</th>
              <th className="p-3">Fecha</th>
            </tr>
          </thead>

          <tbody>

            {logs.map((log) => (
              <tr key={log.id} className="border-b hover:bg-gray-50">

                <td className="p-3">
                  {log.user?.email || "Sistema"}
                </td>

                <td className="p-3 font-medium">
                  {log.action}
                </td>

                <td className="p-3 text-sm text-gray-600">
                  {log.metadata
                    ? JSON.stringify(log.metadata)
                    : "-"}
                </td>

                <td className="p-3 text-sm">
                  {new Date(log.createdAt).toLocaleString()}
                </td>

              </tr>
            ))}

            {logs.length === 0 && (
              <tr>
                <td colSpan={4} className="p-6 text-center text-gray-500">
                  No se encontraron resultados
                </td>
              </tr>
            )}

          </tbody>

        </table>

      </div>

    </div>
  )
}