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
        alert("No hay passkey registrada");
        return;
      }

      const options = await optionsRes.json();

      // 👇 CAMBIO IMPORTANTE AQUÍ
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
        alert("Error autenticando");
        return;
      }

      window.location.href = "/dashboard";

    } catch (err) {
      console.error(err);
      alert("Error iniciando Entrar Fácil");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleLogin}
      disabled={loading}
      className="w-full bg-green-600 hover:bg-green-700 text-white py-5 rounded-2xl text-2xl font-semibold transition"
    >
      {loading ? "Ingresando..." : "🔐 Entrar Fácil"}
    </button>
  );
}
