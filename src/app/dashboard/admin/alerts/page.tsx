import { prisma } from "@/lib/prisma"
import { getValidatedSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Role } from "@prisma/client"

// 🔥 TIPOS FUERTES (PRO)
type RiskAlert = {
  type: "risk"
  user: string
  score: number
  reason: string
}

type SuspiciousAlert = {
  type: "suspicious"
  user: string
  count: number
}

type Alert = RiskAlert | SuspiciousAlert

export default async function AdminAlertsPage() {

  const session = await getValidatedSession()

  if (!session) {
    redirect("/?auth=required")
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId }
  })

  if (!user || user.role !== Role.ADMIN) {
    redirect("/dashboard")
  }

  // 🕒 Últimas 24 horas
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000)

  const logs = await prisma.auditLog.findMany({
    where: {
      createdAt: {
        gte: since
      }
    },
    include: {
      user: true
    },
    orderBy: {
      createdAt: "desc"
    }
  })

  // =============================
  // 🧠 ACTIVIDAD SOSPECHOSA
  // =============================

  const activityMap: Record<string, number> = {}

  for (const log of logs) {
    const key = log.user?.email || "Sistema"
    activityMap[key] = (activityMap[key] || 0) + 1
  }

  const suspiciousAlerts: SuspiciousAlert[] = Object.entries(activityMap)
    .filter(([_, count]) => count > 20)
    .map(([user, count]) => ({
      type: "suspicious",
      user,
      count
    }))

  // =============================
  // 🚨 ALERTAS DE RIESGO
  // =============================

  const riskAlerts: RiskAlert[] = logs
    .filter(log => log.action === "HIGH_RISK_PATIENT")
    .map(log => ({
      type: "risk",
      user: log.user?.email || "Paciente",
      score: (log.metadata as any)?.score ?? 0,
      reason: (log.metadata as any)?.reason ?? "Riesgo alto"
    }))

  // =============================
  // 🔥 COMBINAR + ORDENAR
  // =============================

  const alerts: Alert[] = [...riskAlerts, ...suspiciousAlerts]

  // 🔥 ordenar: primero riesgo, luego suspicious
  alerts.sort((a, b) => {
    if (a.type === "risk" && b.type !== "risk") return -1
    if (a.type !== "risk" && b.type === "risk") return 1
    return 0
  })

  return (
    <div className="space-y-6">

      <h1 className="text-2xl font-bold">
        🚨 Centro de Alertas
      </h1>

      {alerts.length === 0 ? (
        <div className="bg-green-50 border border-green-300 p-6 rounded-lg">
          <p className="text-green-800 font-semibold">
            ✔ No se detectaron alertas
          </p>
        </div>
      ) : (

        <div className="space-y-4">

          {alerts.map((alert, i) => (

            <div
              key={i}
              className={`p-6 rounded-lg border ${
                alert.type === "risk"
                  ? "bg-red-50 border-red-300"
                  : "bg-yellow-50 border-yellow-300"
              }`}
            >

              {/* 🔴 RIESGO CLÍNICO */}
              {alert.type === "risk" && (
                <>
                  <p className="text-red-800 font-semibold text-lg">
                    🔴 Riesgo clínico alto
                  </p>

                  <p className="text-red-700 mt-2">
                    <strong>{alert.user}</strong> tiene un score de{" "}
                    <strong>{alert.score}</strong>
                  </p>

                  <p className="text-red-600 text-sm mt-1">
                    {alert.reason}
                  </p>
                </>
              )}

              {/* ⚠️ ACTIVIDAD SOSPECHOSA */}
              {alert.type === "suspicious" && (
                <>
                  <p className="text-yellow-800 font-semibold text-lg">
                    ⚠️ Actividad sospechosa
                  </p>

                  <p className="text-yellow-700 mt-2">
                    <strong>{alert.user}</strong> realizó{" "}
                    <strong>{alert.count}</strong> acciones en 24h
                  </p>
                </>
              )}

            </div>

          ))}

        </div>
      )}

    </div>
  )
}