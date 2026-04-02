"use client";

import { startAuthentication } from "@simplewebauthn/browser";
import { useState } from "react";

export default function EntrarFacilLoginButton() {
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    try {
      setLoading(true);

      const optionsRes = await fetch(
        "/api/auth/passkey/login/start",
        {
          method: "POST",
          credentials: "include",
        }
      );

      if (!optionsRes.ok) {
        throw new Error("NO_PASSKEY");
      }

      const options = await optionsRes.json();

      // 🔥 Esto dispara Face ID / Huella
      const assertion = await startAuthentication({
        optionsJSON: options,
      });

      const verifyRes = await fetch(
        "/api/auth/passkey/login/finish",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(assertion),
        }
      );

      if (!verifyRes.ok) {
        throw new Error("VERIFY_FAILED");
      }

      window.location.href = "/dashboard";

    } catch (err: any) {
      console.error(err);

      // 🔥 UX para viejitos (CLAVE)
      if (err.name === "NotAllowedError") {
        alert("No se pudo usar la huella o Face ID");
      } else if (err.message === "NO_PASSKEY") {
        alert("Primero debes activar Entrar Fácil");
      } else {
        alert("No se pudo iniciar sesión. Intenta nuevamente.");
      }

    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleLogin}
      disabled={loading}
      className="w-full bg-green-600 hover:bg-green-700 text-white py-5 rounded-2xl text-2xl font-semibold transition flex items-center justify-center gap-3"
    >
      {loading ? (
        "Usando huella o Face ID..."
      ) : (
        <>
          👆 Entrar Fácil
        </>
      )}
    </button>
  );
}