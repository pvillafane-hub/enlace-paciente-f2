import type { NextApiRequest, NextApiResponse } from "next";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { rpID } from "@/config/webauthn";

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

    res.setHeader(
      "Set-Cookie",
      `passkey_challenge=${options.challenge}; HttpOnly; Path=/; SameSite=Lax;`
    );

    return res.status(200).json(options);

  } catch (err) {
    console.error("🔥 Login start error:", err);
    return res.status(500).json({ error: "Internal error" });
  }
}