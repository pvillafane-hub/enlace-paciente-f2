import type { NextApiRequest, NextApiResponse } from "next";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import { prisma } from "@/lib/prisma";

// 🔥 CONFIG CORRECTO (alineado con login)
const rpName = "Enlace Salud";

const isProd = process.env.NODE_ENV === "production";

const rpID = isProd
  ? "enlace-salud-seven.vercel.app"
  : "localhost";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const sessionId = req.cookies.pp_session;

    if (!sessionId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { user: { include: { AuthMethod: true } } },
    });

    // ✅ Validación sólida
    if (!session || !session.user || !session.user.id) {
      return res.status(401).json({ error: "Invalid session" });
    }

    const user = session.user;

    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userID: new TextEncoder().encode(user.id),
      userName: user.email,

      attestationType: "none",

      excludeCredentials: user.AuthMethod.map((method) => ({
        id: method.credentialId,
        type: "public-key",
      })),

      authenticatorSelection: {
        residentKey: "required",
        userVerification: "preferred",
      },
    });

    // 🔥 Guardar challenge en sesión
    await prisma.session.update({
      where: { id: sessionId },
      data: {
        challenge: options.challenge,
      },
    });

    return res.status(200).json(options);

  } catch (error) {
    console.error("🔥 Register Start Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}