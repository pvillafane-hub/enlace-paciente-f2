"use client";

import { useEffect, useRef } from "react";
import { startRegistration } from "@simplewebauthn/browser";
import { useRouter } from "next/navigation";

export default function SignupSuccessPage() {
  const router = useRouter();
  const hasRun = useRef(false); // evita doble ejecución en dev

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    console.log("Signup success page mounted");

    const registerPasskey = async () => {
      try {
        console.log("🔐 Starting passkey registration...");

        // ⏱️ Timeout de seguridad (10s)
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        // 1️⃣ Pedir opciones al backend
        const optionsRes = await fetch(
          "/api/auth/passkey/register/start",
          {
            method: "POST",
            credentials: "include",
            signal: controller.signal,
          }
        );

        clearTimeout(timeout);

        // 🔴 Si no hay sesión → no bloquear UX
        if (!optionsRes.ok) {
          console.warn(
            "⚠️ No session or failed to get options. Skipping passkey setup."
          );

          router.replace("/dashboard");
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
          console.warn("⚠️ Passkey verification failed, continuing anyway");
          router.replace("/dashboard");
          return;
        }

        console.log("✅ Passkey registered successfully");

        // 4️⃣ Redirigir al dashboard
        router.replace("/dashboard");

      } catch (err: any) {
        // 🚨 Caso usuario cancela biometría (muy común)
        if (err?.name === "NotAllowedError") {
          console.warn("⚠️ User cancelled passkey setup");
        } else if (err?.name === "AbortError") {
          console.warn("⏱️ Request timeout");
        } else {
          console.error("🔥 Registration error:", err);
        }

        // 👉 Nunca bloqueamos el usuario
        router.replace("/dashboard");
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