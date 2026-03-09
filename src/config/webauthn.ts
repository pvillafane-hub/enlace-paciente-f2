export const rpID =
  process.env.NODE_ENV === "production"
    ? "portal-paciente-orpin.vercel.app"
    : "localhost";

export const origin =
  process.env.NODE_ENV === "production"
    ? "https://portal-paciente-orpin.vercel.app"
    : "http://localhost:3000";

export const rpName = "Enlace Salud";