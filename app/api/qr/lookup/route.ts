import { getValidatedSession } from '@/lib/auth'
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const session = await getValidatedSession()
    if (!session || !await prisma.user.findFirst({ where: { id: session.userId, role: 'DOCTOR', active: true }, select: { id: true } })) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    const { token } = await req.json()

    if (typeof token !== 'string' || token.length > 128) {
      return NextResponse.json({ error: "Token requerido" }, { status: 400 })
    }

    const qr = await prisma.patientQRToken.findUnique({
      where: { token },
      include: {
        user: true
      }
    })

    if (!qr || !qr.user.active || qr.user.role !== 'PATIENT') {
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