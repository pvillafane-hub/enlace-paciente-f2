import { prisma } from "@/lib/prisma"
import { getValidatedSession } from "@/lib/auth"
import { NextResponse } from "next/server"

export async function GET() {
  const session = await getValidatedSession()

  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userId = session.userId

  // 🔍 buscar licencia existente
  const existing = await prisma.license.findFirst({
    where: {
      userId,
      role: "DOCTOR"
    }
  })

  if (existing) {
    await prisma.license.update({
      where: { id: existing.id },
      data: {
        status: "ACTIVE",
        plan: "PRO"
      }
    })
  } else {
    await prisma.license.create({
      data: {
        userId,
        role: "DOCTOR",
        status: "ACTIVE",
        plan: "PRO"
      }
    })
  }

  return NextResponse.json({
    success: true,
    message: "Licencia activada 🚀"
  })
}