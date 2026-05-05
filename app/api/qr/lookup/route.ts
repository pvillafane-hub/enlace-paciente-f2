import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
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

    if (!qr) {
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