import { validDateOnly } from '@/lib/file-policy'
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

    if ((dateOfBirth && (!validDateOnly(dateOfBirth) || new Date(dateOfBirth) > new Date())) ||
        (bloodType && !['O+','O-','A+','A-','B+','B-','AB+','AB-'].includes(bloodType)) ||
        (allergies && (typeof allergies !== 'string' || allergies.length > 2000))) return NextResponse.json({ error: 'Información inválida' }, { status: 400 })
    const actor = await prisma.user.findFirst({ where: { id: userId, role: 'PATIENT', active: true }, select: { id: true } })
    if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    await prisma.$transaction(async tx => {
      await tx.user.update({ where: { id: userId }, data: { dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null, bloodType: bloodType || null, allergies: allergies || null } })
      await tx.auditLog.create({ data: { userId, action: 'PATIENT_PROFILE_UPDATED' } })
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