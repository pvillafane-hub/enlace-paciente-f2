'use server'

import { prisma } from "@/lib/prisma"
import { getValidatedSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Role } from "@prisma/client"
import { revalidatePath } from "next/cache"

// 🔥 ACTIVAR / DESACTIVAR USUARIO
export async function toggleUserActive(userId: string) {

  const session = await getValidatedSession()

  if (!session) {
    redirect("/?auth=required")
  }

  // 🔥 FIX CRÍTICO
  if (!session.userId) {
    redirect("/?auth=required")
  }

  const adminId = session.userId

  const admin = await prisma.user.findUnique({
    where: { id: adminId }
  })

  if (!admin || admin.role !== Role.ADMIN) {
    throw new Error("Unauthorized")
  }

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

  const session = await getValidatedSession()

  if (!session) {
    redirect("/?auth=required")
  }

  // 🔥 FIX CRÍTICO
  if (!session.userId) {
    redirect("/?auth=required")
  }

  const adminId = session.userId

  const admin = await prisma.user.findUnique({
    where: { id: adminId }
  })

  if (!admin || admin.role !== Role.ADMIN) {
    throw new Error("Unauthorized")
  }

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

  await prisma.user.update({
    where: { id: userId },
    data: {
      role: newRole
    }
  })

  revalidatePath("/dashboard/admin/users")
}