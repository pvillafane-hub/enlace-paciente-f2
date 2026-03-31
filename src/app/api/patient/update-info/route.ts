import { prisma } from "@/lib/prisma"
import { getValidatedSession } from "@/lib/auth"
import { NextResponse } from "next/server"

export async function POST(req: Request) {

  try {

    const session = await getValidatedSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()

    const { dateOfBirth, bloodType, allergies } = body

    await prisma.user.update({
      where: { id: session.userId },
      data: {
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        bloodType,
        allergies,
      },
    })

    return NextResponse.json({ ok: true })

  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}