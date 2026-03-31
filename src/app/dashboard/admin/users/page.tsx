import { getValidatedSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { Role } from "@prisma/client"
import { toggleUserActive, changeUserRole } from "@/app/dashboard/admin/users/actions"

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ query?: string }>
}) {

  const params = await searchParams
  const query = params?.query || ""

  const session = await getValidatedSession()

  if (!session) {
    redirect("/?auth=required")
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId }
  })

  if (!user || user.role !== Role.ADMIN) {
    redirect("/dashboard")
  }

  // 🔥 NORMALIZAR QUERY
  const normalizedQuery = query.trim().toLowerCase()

  // 🔥 MAPEO DE ROLE
  const roleMap: Record<string, Role> = {
    patient: Role.PATIENT,
    doctor: Role.DOCTOR,
    admin: Role.ADMIN,
  }

  const matchedRole = roleMap[normalizedQuery]

  const users = await prisma.user.findMany({
    where: normalizedQuery
      ? {
          OR: [
            {
              email: {
                contains: normalizedQuery,
                mode: "insensitive",
              },
            },
            {
              fullName: {
                contains: normalizedQuery,
                mode: "insensitive",
              },
            },
            ...(matchedRole
              ? [
                  {
                    role: {
                      equals: matchedRole,
                    },
                  },
                ]
              : []),
          ],
        }
      : {},
    orderBy: { createdAt: "desc" }
  })

  return (
    <div className="space-y-6">

      <h1 className="text-2xl font-bold">
        Administración de Usuarios
      </h1>

      {/* 🔍 SEARCH */}
      <form method="GET">
        <input
          type="text"
          name="query"
          defaultValue={query}
          placeholder="Buscar por email, nombre o rol..."
          className="w-full border rounded-lg px-4 py-3"
        />
      </form>

      <div className="bg-white border rounded-lg overflow-hidden">

        <table className="w-full text-left">

          <thead className="border-b bg-gray-50">
            <tr>
              <th className="p-3">Email</th>
              <th className="p-3">Nombre</th>
              <th className="p-3">Rol</th>
              <th className="p-3">Creado</th>
              <th className="p-3">Estado</th>
              <th className="p-3">Acción</th>
            </tr>
          </thead>

          <tbody>

            {users.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-gray-500">
                  No se encontraron usuarios
                </td>
              </tr>
            )}

            {users.map((u) => (
              <tr key={u.id} className="border-b hover:bg-gray-50">

                <td className="p-3">{u.email}</td>

                <td className="p-3">{u.fullName}</td>

                <td className="p-3 space-y-2">

                  <div className="font-medium">{u.role}</div>

                  {u.role !== "ADMIN" && (
                    <div className="flex gap-2 flex-wrap">

                      {u.role !== "PATIENT" && (
                        <form action={changeUserRole.bind(null, u.id, "PATIENT")}>
                          <button className="text-xs bg-gray-100 px-2 py-1 rounded hover:bg-gray-200">
                            Hacer Paciente
                          </button>
                        </form>
                      )}

                      {u.role !== "DOCTOR" && (
                        <form action={changeUserRole.bind(null, u.id, "DOCTOR")}>
                          <button className="text-xs bg-blue-100 px-2 py-1 rounded hover:bg-blue-200">
                            Hacer Doctor
                          </button>
                        </form>
                      )}

                    </div>
                  )}

                </td>

                <td className="p-3">
                  {new Date(u.createdAt).toLocaleDateString()}
                </td>

                <td className="p-3">
                  <span
                    className={`px-2 py-1 rounded text-sm ${
                      u.active
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {u.active ? "Activo" : "Inactivo"}
                  </span>
                </td>

                <td className="p-3 space-y-2">
                  <form action={toggleUserActive.bind(null, u.id)}>
                    <button className="text-blue-600 underline">
                      {u.active ? "Desactivar" : "Activar"}
                    </button>
                  </form>
                </td>

              </tr>
            ))}

          </tbody>

        </table>

      </div>

    </div>
  )
}