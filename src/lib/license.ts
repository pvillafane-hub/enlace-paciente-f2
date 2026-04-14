import { prisma } from "@/lib/prisma"

// 🔍 Obtener licencia activa del usuario
export async function getUserLicense(userId: string) {
  if (!userId) return null

  return await prisma.license.findFirst({
    where: {
      userId,
      status: "ACTIVE",
    },
    orderBy: {
      createdAt: "desc",
    },
  })
}

// ✅ Verifica si tiene licencia activa
export function hasActiveLicense(license: any) {
  return license?.status === "ACTIVE"
}

// 🔓 Verifica si es PRO (para futuro)
export function isPro(license: any) {
  return license?.plan === "PRO"
}