'use client'

import { useState } from 'react'

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)

    await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: formData.get('email'),
      }),
    })

    // No revelamos si el email existe
    setSent(true)
    setLoading(false)
  }

  return (
    <div className="max-w-md mx-auto mt-16 bg-white p-8 rounded-2xl shadow-md">
      <h2 className="text-3xl font-bold mb-6">
        Recuperar acceso
      </h2>

      {sent ? (
        <div className="bg-green-50 border border-green-300 text-green-800 p-4 rounded-xl text-lg">
          Si el correo está registrado, recibirá instrucciones para restablecer su contraseña.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <label className="block text-lg font-semibold">
            Correo electrónico
            <input
              type="email"
              name="email"
              required
              className="mt-2 w-full p-4 text-lg border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white p-4 rounded-xl text-xl font-semibold hover:bg-blue-700 transition"
          >
            {loading ? 'Enviando...' : 'Enviar instrucciones'}
          </button>
        </form>
      )}
    </div>
  )
}