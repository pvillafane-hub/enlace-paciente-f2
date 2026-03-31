import type { NextApiRequest, NextApiResponse } from "next";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { rpID } from "@/config/webauthn";
import { prisma } from "@/lib/prisma";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const options = await generateAuthenticationOptions({
      rpID,
      userVerification: "preferred",
    });

    // 🔥 GUARDAR CHALLENGE SIN REQUERIR SESIÓN
    // Creamos sesión temporal
    const tempSession = await prisma.session.create({
      data: {
        userId: undefined, // 👈 clave
        challenge: options.challenge,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 min
      },
    });

    const isProd = process.env.NODE_ENV === "production";

    res.setHeader(
      "Set-Cookie",
      `pp_session=${tempSession.id}; Path=/; HttpOnly; ${
        isProd ? "Secure;" : ""
      } SameSite=Lax`
    );

    return res.status(200).json(options);

  } catch (err) {
    console.error("🔥 Login start error:", err);
    return res.status(500).json({ error: "Internal error" });
  }
}