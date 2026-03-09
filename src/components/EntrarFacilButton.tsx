"use client";

import { startRegistration } from "@simplewebauthn/browser";
import { useState } from "react";

export default function EntrarFacilButton() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleRegister = async () => {
    try {
      setLoading(true);

      const optionsRes = await fetch(
        "/api/auth/passkey/register/start",
        {
          method: "POST",
          credentials: "include",
        }
      );

      if (!optionsRes.ok) {
        throw new Error("No se pudo iniciar registro");
      }

      const options = await optionsRes.json();

      // 🔥 FIX AQUÍ
      const attestation = await startRegistration({
        optionsJSON: options,
      });

      const verifyRes = await fetch(
        "/api/auth/passkey/register/finish",
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(attestation),
        }
      );

      if (!verifyRes.ok) {
        const error = await verifyRes.json();
        console.error(error);
        throw new Error("Falló la verificación");
      }

      setSuccess(true);
    } catch (err) {
      console.error(err);
      alert("Error activando Entrar Fácil");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="bg-green-100 text-green-800 p-4 rounded-xl text-lg font-semibold w-full text-center">
        ✅ Entrar Fácil activado en este dispositivo
      </div>
    );
  }

  return (
    <button
      onClick={handleRegister}
      disabled={loading}
      className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-2xl text-xl font-semibold transition"
    >
      {loading
        ? "Activando..."
        : "🔐 Activar Entrar Fácil en este dispositivo"}
    </button>
  );
}