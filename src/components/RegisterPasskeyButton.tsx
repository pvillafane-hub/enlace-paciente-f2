"use client"

import { startRegistration } from "@simplewebauthn/browser"
import { useState } from "react"
import { useRouter } from "next/navigation"

export default function RegisterPasskeyButton() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleRegister = async () => {
    try {
      setLoading(true)

      // 1️⃣ Pedir opciones al backend
      const optionsRes = await fetch(
        "/api/auth/passkey/register/start",
        {
          method: "POST",
          credentials: "include",
        }
      )

      if (!optionsRes.ok) {
        alert("No se pudo iniciar el registro.")
        return
      }

      const options = await optionsRes.json()

      // 2️⃣ Ejecutar WebAuthn en el navegador
      const registrationResponse = await startRegistration(options)

      // 3️⃣ Enviar respuesta al backend
      const verificationRes = await fetch(
        "/api/auth/passkey/register/finish",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(registrationResponse),
        }
      )

      if (!verificationRes.ok) {
        alert("No se pudo completar el registro.")
        return
      }

      alert("✅ Entrar Fácil activado correctamente.")

      // Refrescar Security page
      router.refresh()

    } catch (err) {
      console.error(err)
      alert("Ocurrió un error durante el registro.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleRegister}
      disabled={loading}
      className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition disabled:opacity-50"
    >
      {loading ? "Activando..." : "Activar Entrar Fácil"}
    </button>
  )
}