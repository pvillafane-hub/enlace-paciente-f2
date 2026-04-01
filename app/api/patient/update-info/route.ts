import { prisma } from "@/lib/prisma"
import { getValidatedSession } from "@/lib/auth"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const session = await getValidatedSession()

    // 🔐 Validar sesión
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // 🔥 FIX CRÍTICO (evita string | null)
    if (!session.userId) {
      return NextResponse.json(
        { error: "Sesión inválida (sin usuario)" },
        { status: 401 }
      )
    }

    const userId = session.userId

    const body = await req.json()
    const { dateOfBirth, bloodType, allergies } = body

    await prisma.user.update({
      where: { id: userId },
      data: {
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        bloodType: bloodType || null,
        allergies: allergies || null,
      },
    })

    return NextResponse.json({ ok: true })

  } catch (error) {
    console.error("UPDATE INFO ERROR:", error)

    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    )
  }
}