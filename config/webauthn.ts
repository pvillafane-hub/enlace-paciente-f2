// config/webauthn.ts

function getDomainFromEnv(): string {
  // 🔥 En Vercel, esto viene automático
  const vercelUrl = process.env.VERCEL_URL;

  if (vercelUrl) {
    return vercelUrl;
  }

  // Local dev
  return "localhost";
}

function getOrigin(): string {
  const domain = getDomainFromEnv();

  if (domain === "localhost") {
    return "http://localhost:3000";
  }

  return `https://${domain}`;
}

export const rpID = getDomainFromEnv();

export const origin = getOrigin();