import { clinicDoctorId } from '@/lib/access'
import { prisma } from "@/lib/prisma"
import { getValidatedSession } from "@/lib/auth"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const session = await getValidatedSession()

    if (!session) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      )
    }

    if (!session.userId) {
      return NextResponse.json(
        { error: "Sesión inválida" },
        { status: 401 }
      )
    }

    const actor = await prisma.user.findUnique({ where: { id: session.userId } })
    const userId = actor ? await clinicDoctorId(actor) : null
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

    const alerts = await prisma.medicalAlert.findMany({
      where: {
        doctorId: userId,
        resolved: false,
        patient: { active: true, patientDoctors: { some: { doctorId: userId } } }
      },
      include: {
        patient: {
          select: {
            id: true,
            fullName: true
          }
        }
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
        patientName: a.patient?.fullName || "Paciente",
        patientId: a.patient?.id || a.patientId
      }))
    )

  } catch (error) {
    console.error("ALERTS ERROR:", error)

    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}