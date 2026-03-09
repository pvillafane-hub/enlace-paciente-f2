'use client';

import { useFormState } from 'react-dom'

type FormState = {
  error?: string
  success?: string
}
export default function ChangePasswordForm({ action }: any) {
  const [state, formAction] = useFormState<FormState, FormData>(action, {})

  return (
    <div className="max-w-md mx-auto bg-white p-8 rounded-2xl shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-center">
        Cambiar contraseña
      </h2>

      <form action={formAction} className="space-y-6">

        {state?.error && (
          <div className="bg-red-50 border border-red-300 text-red-800 p-4 rounded-xl">
            {state.error}
          </div>
        )}

        {state?.success && (
          <div className="bg-green-50 border border-green-300 text-green-800 p-4 rounded-xl">
            {state.success}
          </div>
        )}

        <div>
          <label className="block font-semibold mb-2">
            Contraseña actual
          </label>
          <input
            type="password"
            name="currentPassword"
            required
            className="w-full p-4 border rounded-xl min-h-[56px]"
          />
        </div>

        <div>
          <label className="block font-semibold mb-2">
            Nueva contraseña
          </label>
          <input
            type="password"
            name="newPassword"
            required
            className="w-full p-4 border rounded-xl min-h-[56px]"
          />
        </div>

        <div>
          <label className="block font-semibold mb-2">
            Confirmar nueva contraseña
          </label>
          <input
            type="password"
            name="confirmPassword"
            required
            className="w-full p-4 border rounded-xl min-h-[56px]"
          />
        </div>

        <button
          type="submit"
          className="w-full min-h-[56px] bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold text-lg hover:scale-[1.01] transition"
        >
          Actualizar contraseña
        </button>
      </form>
    </div>
  )
}