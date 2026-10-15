'use client'

import { useActionState } from 'react'
import { signup } from './actions'

export default function SignupPage() {
  const [state, formAction, pending] = useActionState(signup, null)

  return (
    <div className="max-w-md mx-auto mt-16 bg-white p-6 rounded-xl border">
      <h2 className="text-3xl font-bold mb-6">Crear cuenta</h2>

      <form action={formAction} className="space-y-4">
        <label className="block">Fecha de nacimiento<input aria-label="Fecha de nacimiento" type="date" name="dateOfBirth" required className="block w-full border p-3 rounded text-lg" /></label>
        <label className="block">Teléfono del paciente o padre/tutor<input type="tel" name="contactPhone" required autoComplete="tel" className="block w-full border p-3 rounded text-lg" /></label>
        <p>Usamos estos datos para detectar posibles registros duplicados. Una coincidencia requiere revisión de Admin.</p>
        {state?.error && (
          <div className="bg-red-50 text-red-700 p-3 rounded">
            {state.error}
          </div>
        )}

        <input
          name="fullName"
          placeholder="Nombre completo"
          className="w-full border p-3 rounded text-lg"
          required
        />

        <input
          type="email"
          name="email"
          placeholder="Email"
          className="w-full border p-3 rounded text-lg"
          required
        />

        <input
          type="password"
          name="password"
          placeholder="Contraseña"
          className="w-full border p-3 rounded text-lg"
          required
        />

        <button disabled={pending} className="w-full bg-blue-600 text-white p-3 rounded text-lg">
          Registrarse
        </button>
      </form>

      {/* MFA READY UX */}
      <div className="bg-blue-50 p-4 rounded mt-6">
        <p className="font-medium">🔐 Seguridad adicional</p>
        <p className="text-sm text-gray-600">
          Próximamente podrás activar verificación en dos pasos.
        </p>
      </div>
    </div>
  )
}
