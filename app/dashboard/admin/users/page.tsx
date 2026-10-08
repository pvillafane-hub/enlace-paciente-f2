import { getValidatedSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { Role } from "@prisma/client"
import ConfirmUserForm from "./ConfirmUserForm"
import {
  toggleUserActive,
  changeUserRole,
  assignUserAsStaff,
} from "app/dashboard/admin/users/actions"

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ query?: string }>
}) {
  const params = await searchParams
  const query = params?.query || ""

  const session = await getValidatedSession()

  if (!session?.userId) {
    redirect("/?auth=required")
  }

  const userId = session.userId

  const user = await prisma.user.findUnique({
    where: { id: userId },
  })

  if (!user || user.role !== Role.ADMIN) {
    redirect("/dashboard")
  }

  const normalizedQuery = query.trim().toLowerCase()

  const roleMap: Record<string, Role> = {
    patient: Role.PATIENT,
    doctor: Role.DOCTOR,
    staff: Role.STAFF,
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
    orderBy: { createdAt: "desc" },
  })

  const doctors = await prisma.user.findMany({
    where: {
      role: Role.DOCTOR,
      active: true,
    },
    orderBy: {
      fullName: "asc",
    },
  })

  // 🔥 Relación STAFF → DOCTOR
  // Lo hacemos separado para no depender del include staffAssignments en User.
  const staffRelations = await prisma.clinicStaff.findMany({
    where: {
      active: true,
    },
    include: {
      doctor: true,
    },
  })

  const assignedDoctorByStaffId = new Map(
    staffRelations.map((relation) => [
      relation.staffId,
      relation.doctor,
    ])
  )

  return (
    <div className="space-y-6">

      <h1 className="text-2xl font-bold">
        Administración de Usuarios
      </h1>

      {/* BUSCAR */}
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
              <th className="p-3">Doctor asignado</th>
              <th className="p-3">Creado</th>
              <th className="p-3">Estado</th>
              <th className="p-3">Acción</th>
            </tr>
          </thead>

          <tbody>

            {users.length === 0 && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-gray-500">
                  No se encontraron usuarios
                </td>
              </tr>
            )}

            {users.map((u) => {
              const assignedDoctor =
                assignedDoctorByStaffId.get(u.id) || null

              return (
                <tr key={u.id} className="border-b hover:bg-gray-50">

                  <td className="p-3">
                    {u.email}
                  </td>

                  <td className="p-3">
                    {u.fullName}
                  </td>

                  <td className="p-3 space-y-2">

                    <div className="font-medium">
                      {u.role}
                    </div>

                    {u.role !== Role.ADMIN && (
                      <div className="space-y-2">

                        <div className="flex gap-2 flex-wrap">

                          {u.role !== Role.PATIENT && (
                            <ConfirmUserForm action={changeUserRole.bind(null, u.id, "PATIENT")} message={`Cambiar ${u.fullName} (${u.email}) de ${u.role} a Paciente. Se cerrarán sus sesiones y se desactivarán sus asignaciones como Staff.`}>
                              <button className="text-xs bg-gray-100 px-2 py-1 rounded hover:bg-gray-200">
                                Hacer Paciente
                              </button>
                            </ConfirmUserForm>
                          )}

                          {u.role !== Role.DOCTOR && (
                            <ConfirmUserForm action={changeUserRole.bind(null, u.id, "DOCTOR")} message={`Cambiar ${u.fullName} (${u.email}) de ${u.role} a Doctor. Tendrá las funciones de Doctor, sujetas a sus permisos y licencia. Se cerrarán sus sesiones y se desactivarán sus asignaciones como Staff.`}>
                              <button className="text-xs bg-blue-100 px-2 py-1 rounded hover:bg-blue-200">
                                Hacer Doctor
                              </button>
                            </ConfirmUserForm>
                          )}

                        </div>

                        {u.role !== Role.STAFF && (
                          <ConfirmUserForm
                            message={`Asignar ${u.fullName} (${u.email}) como Staff. Su cuenta quedará activa, tendrá acceso según los permisos del doctor seleccionado y se reemplazarán sus asignaciones anteriores como Staff. Se cerrarán sus sesiones.`}
                            action={assignUserAsStaff.bind(null, u.id)}
                            className="flex gap-2 items-center flex-wrap"
                          >
                            <select
                              name="doctorId"
                              required
                              className="text-xs border rounded px-2 py-1"
                              defaultValue=""
                            >
                              <option value="">Seleccionar doctor</option>

                              {doctors.map((doctor) => (
                                <option key={doctor.id} value={doctor.id}>
                                  {doctor.fullName} · {doctor.email}
                                </option>
                              ))}
                            </select>

                            <button className="text-xs bg-purple-100 px-2 py-1 rounded hover:bg-purple-200">
                              Hacer Staff
                            </button>
                          </ConfirmUserForm>
                        )}

                        {u.role === Role.STAFF && (
                          <ConfirmUserForm
                            message={`Asignar ${u.fullName} (${u.email}) como Staff. Su cuenta quedará activa, tendrá acceso según los permisos del doctor seleccionado y se reemplazarán sus asignaciones anteriores como Staff. Se cerrarán sus sesiones.`}
                            action={assignUserAsStaff.bind(null, u.id)}
                            className="flex gap-2 items-center flex-wrap"
                          >
                            <select
                              name="doctorId"
                              required
                              className="text-xs border rounded px-2 py-1"
                              defaultValue={assignedDoctor?.id || ""}
                            >
                              <option value="">Seleccionar doctor</option>

                              {doctors.map((doctor) => (
                                <option key={doctor.id} value={doctor.id}>
                                  {doctor.fullName} · {doctor.email}
                                </option>
                              ))}
                            </select>

                            <button className="text-xs bg-purple-100 px-2 py-1 rounded hover:bg-purple-200">
                              Cambiar doctor
                            </button>
                          </ConfirmUserForm>
                        )}

                      </div>
                    )}

                  </td>

                  <td className="p-3">
                    {u.role === Role.STAFF ? (
                      assignedDoctor ? (
                        <div>
                          <p className="font-medium">
                            {assignedDoctor.fullName}
                          </p>
                          <p className="text-xs text-gray-500">
                            {assignedDoctor.email}
                          </p>
                        </div>
                      ) : (
                        <span className="text-sm text-red-600 font-medium">
                          Staff sin doctor
                        </span>
                      )
                    ) : (
                      <span className="text-sm text-gray-400">
                        —
                      </span>
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
                    <ConfirmUserForm action={toggleUserActive.bind(null, u.id, u.active)} message={`${u.active ? "Desactivar" : "Activar"} a ${u.fullName} (${u.email}). ${u.active ? "No podrá iniciar sesión mientras esté inactiva." : "Podrá iniciar sesión con sus permisos actuales."} Se cerrarán sus sesiones.`}>
                      <button className="text-blue-600 underline">
                        {u.active ? "Desactivar" : "Activar"}
                      </button>
                    </ConfirmUserForm>
                  </td>

                </tr>
              )
            })}

          </tbody>

        </table>

      </div>

    </div>
  )
}