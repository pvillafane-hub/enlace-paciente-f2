'use client'

import { useFormState } from 'react-dom'
import { login } from './actions'
import { useRef, useEffect, useState } from 'react'
import { startAuthentication } from '@simplewebauthn/browser'

export default function LoginPage() {
  const [state, formAction] = useFormState(login, null)

  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)

  const [clientErrors, setClientErrors] = useState<{
    email?: string
    password?: string
  }>({})

  const [hasPasskey, setHasPasskey] = useState(false)
  const [checkingPasskey, setCheckingPasskey] = useState(false)
  const [debounceTimeout, setDebounceTimeout] = useState<any>(null)

  useEffect(() => {
    if (state?.error) {
      setClientErrors({})
    }
  }, [state])

  function validateField(name: string, value: string) {
    let message = ''

    if (name === 'email' && !value.trim()) {
      message = 'Escriba su correo electrónico.'
    }

    if (name === 'password' && !value.trim()) {
      message = 'Escriba su contraseña.'
    }

    setClientErrors(prev => ({
      ...prev,
      [name]: message || undefined,
    }))
  }

  async function checkPasskey(email: string) {
    if (!email.trim()) {
      setHasPasskey(false)
      return
    }

    try {
      setCheckingPasskey(true)

      const res = await fetch('/api/auth/has-passkey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await res.json()
      setHasPasskey(data.hasPasskey)
    } catch (error) {
      console.error(error)
      setHasPasskey(false)
    } finally {
      setCheckingPasskey(false)
    }
  }

  function handleEmailChange(value: string) {
    validateField('email', value)

    if (debounceTimeout) {
      clearTimeout(debounceTimeout)
    }

    const timeout = setTimeout(() => {
      checkPasskey(value)
    }, 500)

    setDebounceTimeout(timeout)
  }

  async function handlePasskeyRecovery() {
    try {
      const res = await fetch('/api/auth/passkey/login/start', {
        method: 'POST',
        credentials: 'include',
      })

      if (!res.ok) {
        alert('No se pudo iniciar autenticación.')
        return
      }

      const options = await res.json()

      const authenticationResponse = await startAuthentication(options)

      const verification = await fetch('/api/auth/passkey/login/finish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(authenticationResponse),
      })

      if (verification.ok) {
        window.location.href = '/reset-password-direct'
      } else {
        alert('Autenticación fallida.')
      }

    } catch (error) {
      console.error(error)
      alert('Error en autenticación.')
    }
  }

  function handleClientValidation(e: React.FormEvent<HTMLFormElement>) {
    const formData = new FormData(e.currentTarget)
    const email = String(formData.get('email') || '')
    const password = String(formData.get('password') || '')

    const errors: typeof clientErrors = {}

    if (!email.trim()) {
      errors.email = 'Escriba su correo electrónico.'
    }

    if (!password.trim()) {
      errors.password = 'Escriba su contraseña.'
    }

    if (Object.keys(errors).length > 0) {
      e.preventDefault()
      setClientErrors(errors)

      if (errors.email && emailRef.current) {
        emailRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
        emailRef.current.focus()
      } else if (errors.password && passwordRef.current) {
        passwordRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
        passwordRef.current.focus()
      }
    }
  }

  const hasErrors =
    state?.error || Object.values(clientErrors).some(Boolean)

  return (
    <div className="w-full max-w-md mx-auto mt-10 md:mt-16 bg-white p-6 md:p-8 rounded-2xl shadow-lg">
      
      <h2 className="text-2xl md:text-3xl font-bold mb-6 text-center">
        Iniciar sesión
      </h2>

      <form
        action={formAction}
        onSubmit={handleClientValidation}
        className="space-y-6"
      >
        {state?.error && (
          <div className="bg-red-50 border border-red-300 text-red-800 p-4 rounded-xl text-lg font-semibold">
            ⚠ El correo o la contraseña no son correctos.
          </div>
        )}

        {/* EMAIL */}
        <div>
          <label className="block text-lg font-semibold">
            Correo electrónico
          </label>
          <input
            ref={emailRef}
            type="email"
            name="email"
            placeholder="Ej. usuario@email.com"
            onChange={(e) => handleEmailChange(e.target.value)}
            className={`mt-2 w-full p-4 text-lg border rounded-xl focus:ring-2 transition min-h-[56px] ${
              clientErrors.email
                ? 'border-red-600 bg-red-50 focus:ring-red-500'
                : 'border-gray-300 focus:ring-blue-500'
            }`}
          />
          {clientErrors.email && (
            <p className="mt-2 text-red-700 font-semibold">
              {clientErrors.email}
            </p>
          )}
        </div>

        {/* PASSWORD */}
        <div>
          <label className="block text-lg font-semibold">
            Contraseña
          </label>
          <input
            ref={passwordRef}
            type="password"
            name="password"
            placeholder="Escriba su contraseña"
            onChange={(e) =>
              validateField('password', e.target.value)
            }
            className={`mt-2 w-full p-4 text-lg border rounded-xl focus:ring-2 transition min-h-[56px] ${
              clientErrors.password
                ? 'border-red-600 bg-red-50 focus:ring-red-500'
                : 'border-gray-300 focus:ring-blue-500'
            }`}
          />
          {clientErrors.password && (
            <p className="mt-2 text-red-700 font-semibold">
              {clientErrors.password}
            </p>
          )}
        </div>

        {/* BOTÓN LOGIN */}
        <button
          type="submit"
          className="w-full min-h-[56px] p-4 rounded-xl text-xl font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md active:scale-[0.99] transition"
        >
          Entrar
        </button>

        {/* RECOVERY */}
        <div className="pt-8 border-t mt-8 space-y-6">

          <p className="text-sm text-gray-500 text-center">
            ¿Necesita ayuda para acceder?
          </p>

          {checkingPasskey && (
            <p className="text-center text-gray-400 text-sm">
              Verificando seguridad...
            </p>
          )}

          {hasPasskey && !checkingPasskey && (
            <button
              type="button"
              onClick={handlePasskeyRecovery}
              className="w-full min-h-[56px] bg-gray-100 border p-4 rounded-xl text-lg hover:bg-gray-200 transition"
            >
              🔐 Recuperar con huella o rostro
            </button>
          )}

          <a
            href="/forgot-password"
            className="block text-center text-blue-600 font-medium hover:text-blue-800 transition"
          >
            📧 Enviar enlace por correo
          </a>

        </div>
      </form>
    </div>
  )
}