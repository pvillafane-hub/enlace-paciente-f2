import { prisma } from "@/lib/prisma"
import { getValidatedSession } from "@/lib/auth"
import { NextResponse } from "next/server"
import crypto from "crypto"

export async function GET() {

  const session = await getValidatedSession()

  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // 🔐 token seguro
  const token = crypto.randomBytes(16).toString("hex")

  // ⏳ expira en 10 minutos
  const expiresAt = new Date(Date.now() + 1000 * 60 * 10)

  await prisma.patientQRToken.create({
    data: {
      token,
      userId: session.userId,
      expiresAt
    }
  })

  return NextResponse.json({
    token,
    url: `${process.env.NEXT_PUBLIC_APP_URL}/qr/${token}`
  })
}
