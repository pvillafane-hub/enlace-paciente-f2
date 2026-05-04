import { prisma } from "@/lib/prisma"
import { getValidatedSession } from "@/lib/auth"
import { NextResponse } from "next/server"

export async function POST(req: Request) {

  const session = await getValidatedSession()

  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { patientId } = await req.json()

  if (!patientId) {
    return NextResponse.json({ error: "Missing patientId" }, { status: 400 })
  }

  try {

    // 🔥 evitar duplicados
    const existing = await prisma.medicalAccessRequest.findUnique({
      where: {
        doctorId_patientId: {
          doctorId: session.userId,
          patientId
        }
      }
    })

    if (existing) {
      return NextResponse.json({ message: "Ya existe solicitud" })
    }

    await prisma.medicalAccessRequest.create({
      data: {
        doctorId: session.userId,
        patientId,
        status: "PENDING"
      }
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    return NextResponse.json({ error: "Error creando solicitud" }, { status: 500 })
  }
}