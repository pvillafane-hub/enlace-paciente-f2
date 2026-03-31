import { prisma } from "@/lib/prisma"
import { getValidatedSession } from "@/lib/auth"
import { NextResponse } from "next/server"

export async function GET() {

  const session = await getValidatedSession()

  if (!session) {
    return NextResponse.json([], { status: 401 })
  }

  const alerts = await prisma.medicalAlert.findMany({
    where: {
      doctorId: session.userId,
      resolved: false
    },
    include: {
      patient: true
    },
    orderBy: {
      createdAt: "desc"
    },
    take: 5
  })

  return NextResponse.json(
    alerts.map(a => ({
      id: a.id,
      type: a.type,
      patientName: a.patient.fullName,
      patientId: a.patient.id
    }))
  )
}