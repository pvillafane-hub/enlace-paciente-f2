import type { NextApiRequest, NextApiResponse } from "next";
import { verifyRegistrationResponse } from "@simplewebauthn/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const rpID =
  process.env.NODE_ENV === "production"
    ? "portal-paciente-orpin.vercel.app"
    : "localhost";

const origin =
  process.env.NODE_ENV === "production"
    ? "https://portal-paciente-orpin.vercel.app"
    : "http://localhost:3000";

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
    });

    if (!session || !session.challenge) {
      return res.status(400).json({ error: "Missing challenge or user" });
    }

    const verification = await verifyRegistrationResponse({
      response: req.body,
      expectedChallenge: session.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return res.status(400).json({ error: "Verification failed" });
    }

    const { credential } = verification.registrationInfo;

    await prisma.authMethod.create({
      data: {
        userId: session.userId,
        type: "passkey",
        credentialId: credential.id,
        publicKey: Buffer.from(credential.publicKey).toString("base64"),
        counter: credential.counter,
      },
    });

    // 🔥 Limpiar challenge después de usarlo
    await prisma.session.update({
      where: { id: sessionId },
      data: {
        challenge: { set: null },
      },
    });

    return res.status(200).json({ verified: true });
  } catch (error) {
    console.error("Register Finish Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}