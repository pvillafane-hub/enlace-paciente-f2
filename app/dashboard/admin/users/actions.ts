'use server'

import { prisma } from "@/lib/prisma"
import { getValidatedSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Role } from "@prisma/client"
import { revalidatePath } from "next/cache"

async function requireAdmin() {
  const session = await getValidatedSession()

  if (!session?.userId) {
    redirect("/?auth=required")
  }

  const admin = await prisma.user.findUnique({
    where: { id: session.userId }
  })

  if (!admin || admin.role !== Role.ADMIN) {
    throw new Error("Unauthorized")
  }

  return admin
}

// 🔥 ACTIVAR / DESACTIVAR USUARIO
export async function toggleUserActive(userId: string) {

  await requireAdmin()

  const user = await prisma.user.findUnique({
    where: { id: userId }
  })

  if (!user) return

  // 🔒 No permitir tocar admins
  if (user.role === Role.ADMIN) {
    throw new Error("No puedes desactivar un admin")
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      active: !user.active
    }
  })

  revalidatePath("/dashboard/admin/users")
}

// 🔥 CAMBIAR ROL DE USUARIO
export async function changeUserRole(
  userId: string,
  newRole: "PATIENT" | "DOCTOR"
) {

  await requireAdmin()

  const user = await prisma.user.findUnique({
    where: { id: userId }
  })

  if (!user) return

  // 🔒 No permitir modificar admins
  if (user.role === Role.ADMIN) {
    throw new Error("No puedes cambiar rol de un admin")
  }

  // 🔒 Evitar cambios innecesarios
  if (user.role === newRole) return

  await prisma.$transaction(async (tx) => {

    await tx.user.update({
      where: { id: userId },
      data: {
        role: newRole
      }
    })

    // 🔥 Si antes era STAFF y ahora pasa a PATIENT/DOCTOR,
    // desactivamos sus asignaciones como staff.
    await tx.clinicStaff.updateMany({
      where: {
        staffId: userId,
        active: true
      },
      data: {
        active: false
      }
    })
  })

  revalidatePath("/dashboard/admin/users")
}

// 🔥 ASIGNAR USUARIO COMO STAFF DE UN DOCTOR
export async function assignUserAsStaff(
  userId: string,
  formData: FormData
) {

  await requireAdmin()

  const doctorId = formData.get("doctorId")

  if (!doctorId || typeof doctorId !== "string") {
    throw new Error("Debe seleccionar un doctor")
  }

  const user = await prisma.user.findUnique({
    where: { id: userId }
  })

  if (!user) {
    throw new Error("Usuario no encontrado")
  }

  if (user.role === Role.ADMIN) {
    throw new Error("No puedes convertir un admin en staff")
  }

  const doctor = await prisma.user.findUnique({
    where: { id: doctorId }
  })

  if (!doctor || doctor.role !== Role.DOCTOR || !doctor.active) {
    throw new Error("Doctor inválido o inactivo")
  }

  await prisma.$transaction(async (tx) => {

    // 1. Convertir usuario a STAFF
    await tx.user.update({
      where: { id: userId },
      data: {
        role: Role.STAFF,
        active: true
      }
    })

    // 2. Desactivar asignaciones anteriores de este staff
    await tx.clinicStaff.updateMany({
      where: {
        staffId: userId,
        active: true
      },
      data: {
        active: false
      }
    })

    // 3. Crear o reactivar la asignación correcta
    await tx.clinicStaff.upsert({
      where: {
        doctorId_staffId: {
          doctorId,
          staffId: userId,
        }
      },
      update: {
        active: true,
        role: "ASSISTANT",
      },
      create: {
        doctorId,
        staffId: userId,
        role: "ASSISTANT",
        active: true,
      }
    })
  })

  revalidatePath("/dashboard/admin/users")
}