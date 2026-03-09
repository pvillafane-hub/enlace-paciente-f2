'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ResetPasswordPage({
  params,
}: {
  params: { token: string }
}) {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)

    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: params.token,
        password: formData.get('password'),
      }),
    })

    if (res.ok) {
      setDone(true)
      setTimeout(() => router.push('/login'), 3000)
    }

    setLoading(false)
  }

  if (done) {
    return (
      <div className="max-w-md mx-auto mt-16 bg-white p-8 rounded-2xl shadow-md text-center">
        <h2 className="text-2xl font-bold text-green-700 mb-4">
          ✅ Contraseña actualizada
        </h2>
        <p className="text-gray-600">
          Puede iniciar sesión nuevamente.
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto mt-16 bg-white p-8 rounded-2xl shadow-md">
      <h2 className="text-3xl font-bold mb-6">
        Restablecer contraseña
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        <input
          type="password"
          name="password"
          required
          placeholder="Nueva contraseña"
          className="w-full p-4 border rounded-lg text-lg"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white p-4 rounded-xl text-xl font-semibold hover:bg-blue-700"
        >
          {loading ? 'Actualizando...' : 'Actualizar contraseña'}
        </button>
      </form>
    </div>
  )
}