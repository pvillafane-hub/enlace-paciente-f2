import type { NextApiRequest, NextApiResponse } from "next"
import { prisma } from "@/lib/prisma"

const SESSION_COOKIE = "pp_session"

async function getApiUser(req: NextApiRequest) {
  const sessionId = req.cookies[SESSION_COOKIE]

  if (!sessionId) return null

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { user: true },
  })

  if (!session || !session.user) return null

  return session.user
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" })
  }

  try {
    const user = await getApiUser(req)
   
    if (!user) {
      return res.status(401).json({ error: "No autenticado" })
    }

    if (user.role !== "DOCTOR" && user.role !== "STAFF") {
      return res.status(403).json({ error: "No autorizado" })
    }

    const { fullName, email } = req.body

    if (!fullName || typeof fullName !== "string") {
      return res.status(400).json({ error: "Nombre del paciente requerido" })
    }

    let doctorId = user.id

    if (user.role === "STAFF") {
      const staffRelation = await prisma.clinicStaff.findFirst({
        where: {
          staffId: user.id,
          active: true,
        },
      })

      if (!staffRelation) {
        return res.status(403).json({
          error: "Este staff no está asignado a un doctor activo",
        })
      }

      doctorId = staffRelation.doctorId
    }

    const cleanEmail =
      typeof email === "string" && email.trim().length > 0
        ? email.trim().toLowerCase()
        : null

    const existingPatient = cleanEmail
      ? await prisma.user.findUnique({
          where: { email: cleanEmail },
        })
      : null

    if (existingPatient && existingPatient.role !== "PATIENT") {
      return res.status(409).json({
        error: "Ese email ya pertenece a otro tipo de usuario",
      })
    }

    const patient =
      existingPatient ||
      (await prisma.user.create({
        data: {
          fullName: fullName.trim(),
          email: cleanEmail || `patient-${crypto.randomUUID()}@enlacesalud.local`,
          passwordHash: "STAFF_CREATED_ACCOUNT",
          role: "PATIENT",
          active: true,
        },
      }))

    await prisma.doctorPatient.upsert({
      where: {
        doctorId_patientId: {
          doctorId,
          patientId: patient.id,
        },
      },
      update: {},
      create: {
        doctorId,
        patientId: patient.id,
      },
    })

    // AuditLog comentado por ahora hasta confirmar tu modelo exacto
    // await prisma.auditLog.create({
    //   data: {
    //     userId: user.id,
    //     action: "STAFF_CREATE_PATIENT",
    //     details: `Paciente activado: ${patient.fullName}`,
    //   },
    // })

    return res.status(200).json({
      success: true,
      patient,
    })
  } catch (error) {
    console.error("STAFF_CREATE_PATIENT_ERROR", error)

    return res.status(500).json({
      error: "Error activando paciente",
    })
  }
}