"use client";

import { useEffect } from "react";
import { startRegistration } from "@simplewebauthn/browser";
import { useRouter } from "next/navigation";

export default function SignupSuccessPage() {
  const router = useRouter();
  console.log("Signup success page mounted");

  useEffect(() => {
    console.log("Running passkey registration...");

    const registerPasskey = async () => {
      try {
        console.log("🔐 Starting passkey registration...");

        // 1️⃣ Pedir opciones al backend
        const optionsRes = await fetch(
          "/api/auth/passkey/register/start",
          {
            method: "POST",
            credentials: "include",
          }
        );

        if (!optionsRes.ok) {
          console.error("❌ Failed to get registration options");
          return;
        }

        const options = await optionsRes.json();

        // 2️⃣ Crear credencial en navegador
        const attestation = await startRegistration({
          optionsJSON: options,
        });

        // 3️⃣ Enviar al backend para guardar
        const verifyRes = await fetch(
          "/api/auth/passkey/register/finish",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(attestation),
          }
        );

        if (!verifyRes.ok) {
          console.error("❌ Failed to verify registration");
          return;
        }

        console.log("✅ Passkey registered successfully");

        // 4️⃣ Redirigir al dashboard
        router.push("/dashboard");

      } catch (err) {
        console.error("🔥 Registration error:", err);
      }
    };

    registerPasskey();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <h1 className="text-xl font-semibold">
        Configurando seguridad...
      </h1>
    </div>
  );
}
