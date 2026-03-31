import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET(req: Request) {
  try {

    const { searchParams } = new URL(req.url)

    const search = searchParams.get("search")
    const from = searchParams.get("from")
    const to = searchParams.get("to")

    const where: any = {}

    // 🔍 filtro por usuario
    if (search) {
      where.user = {
        OR: [
          { email: { contains: search, mode: "insensitive" } },
          { fullName: { contains: search, mode: "insensitive" } },
        ],
      }
    }

    // 📅 filtro por fechas
    if (from || to) {
      where.createdAt = {}

      if (from) {
        where.createdAt.gte = new Date(from)
      }

      if (to) {
        where.createdAt.lte = new Date(to)
      }
    }

    const logs = await prisma.auditLog.findMany({
      where,
      include: { user: true },
      orderBy: { createdAt: "desc" }
    })

    const header = "Usuario,Accion,Detalle,Fecha\n"

    const rows = logs.map((log) => (
      `"${log.user?.email || "Sistema"}","${log.action}","${log.metadata ? JSON.stringify(log.metadata) : ""}","${log.createdAt.toISOString()}"`
    ))

    const csv = header + rows.join("\n")

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": "attachment; filename=logs.csv",
      },
    })

  } catch (error) {
    console.error("EXPORT ERROR:", error)
    return NextResponse.json(
      { error: "Error exporting logs" },
      { status: 500 }
    )
  }
}