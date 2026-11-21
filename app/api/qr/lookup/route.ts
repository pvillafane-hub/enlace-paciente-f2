import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { getValidatedSession } from "@/lib/auth"

export async function POST(req: Request) {
  try {
    const session = await getValidatedSession()
    if (!session?.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const actor = await prisma.user.findUnique({ where: { id: session.userId }, select: { role: true, active: true } })
    if (!actor?.active || actor.role !== "DOCTOR") return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    const { token } = await req.json()

    if (!token) {
      return NextResponse.json({ error: "Token requerido" }, { status: 400 })
    }

    const qr = await prisma.patientQRToken.findUnique({
      where: { token },
      include: {
        user: true
      }
    })

    if (!qr || !qr.user.active || qr.user.role !== "PATIENT") {
      return NextResponse.json({ error: "QR inválido" }, { status: 404 })
    }

    if (qr.expiresAt < new Date()) {
      return NextResponse.json({ error: "QR expirado" }, { status: 410 })
    }

    return NextResponse.json({
      patient: {
        id: qr.user.id,
        name: qr.user.fullName, // ✅ FIX
        email: qr.user.email
      }
    })

  } catch (error) {
    console.error("QR lookup error:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}