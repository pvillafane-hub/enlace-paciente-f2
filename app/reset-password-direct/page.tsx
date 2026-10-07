'use client'

import { useState } from 'react'

export default function ResetPasswordDirectPage() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [message, setMessage] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (password.length < 8) {
      setMessage('La contraseña debe tener al menos 8 caracteres.')
      return
    }

    if (password !== confirm) {
      setMessage('Las contraseñas no coinciden.')
      return
    }

    const res = await fetch('/api/auth/reset-direct', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, password }),
    })

    if (res.ok) {
      window.location.assign('/login?password=changed')
    } else {
      setMessage('Error actualizando contraseña.')
    }
  }

  return (
    <div className="max-w-md mx-auto mt-16 bg-white p-8 rounded-2xl shadow-md">
      <h2 className="text-2xl font-bold mb-6">
        Crear nueva contraseña
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block">Contraseña actual
          <input type="password" autoComplete="current-password" required value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className="w-full border p-3 rounded" />
        </label>
        <p className="text-sm">Use de 8 a 72 bytes, con mayúscula, minúscula, número y símbolo.</p>
        <input
          type="password"
          placeholder="Nueva contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border p-3 rounded"
        />

        <input
          type="password"
          placeholder="Confirmar contraseña"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="w-full border p-3 rounded"
        />

        <button className="w-full bg-blue-600 text-white p-3 rounded">
          Guardar
        </button>
      </form>

      {message && (
        <p className="mt-4 text-center text-red-600">
          {message}
        </p>
      )}
    </div>
  )
}