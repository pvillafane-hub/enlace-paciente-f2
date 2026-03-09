import { getValidatedSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import RegisterPasskeyButton from "@/components/RegisterPasskeyButton"

export default async function SecurityPage() {

  const session = await getValidatedSession()

  if (!session) {
    redirect('/?auth=required')
  }

  const passkey = await prisma.authMethod.findFirst({
    where: { userId: session.userId }
  })

  const passkeyEnabled = !!passkey

  return (
    <div className="max-w-2xl mx-auto">

      <h2 className="text-3xl font-bold mb-8 text-center">
        Seguridad de la cuenta
      </h2>

      <div className="bg-white border rounded-2xl p-8 space-y-10 shadow-sm">

        {/* 🔐 PASSKEY */}
        <section>

          <h3 className="text-xl font-semibold mb-3">
            Entrar Fácil (Huella / Rostro)
          </h3>

          {passkeyEnabled ? (

            <div className="bg-green-50 border border-green-300 rounded-xl p-5">

              <p className="text-green-800 font-semibold text-lg">
                ✔ Entrar Fácil activado
              </p>

              <p className="text-green-700 mt-2">
                Este dispositivo ya está configurado para acceder con huella o reconocimiento facial.
              </p>

              <button
                disabled
                className="
                  mt-4
                  bg-green-600
                  text-white
                  px-5
                  py-2
                  rounded-lg
                  opacity-70
                  cursor-not-allowed
                "
              >
                Dispositivo registrado
              </button>

            </div>

          ) : (

            <div className="bg-blue-50 border border-blue-300 rounded-xl p-5">

              <p className="text-gray-700 mb-4">
                Active acceso rápido y seguro usando huella o reconocimiento facial.
              </p>

              <RegisterPasskeyButton />

            </div>

          )}

        </section>

        <hr />

        {/* 🔑 CONTRASEÑA */}
        <section>

          <h3 className="text-xl font-semibold mb-3">
            Contraseña
          </h3>

          <p className="text-gray-600 mb-4">
            Puede actualizar su contraseña en cualquier momento para mayor seguridad.
          </p>

          <Link
            href="/dashboard/security/change-password"
            className="text-blue-600 underline hover:text-blue-800 transition"
          >
            Cambiar contraseña
          </Link>

        </section>

        <hr />

        {/* 📊 ACTIVIDAD */}
        <section>

          <h3 className="text-xl font-semibold mb-3">
            Actividad de la cuenta
          </h3>

          <p className="text-gray-600">
            Próximamente podrá ver un historial de accesos y acciones importantes realizadas en su cuenta.
          </p>

        </section>

      </div>

      <div className="mt-8 text-center">

        <Link
          href="/dashboard"
          className="text-blue-600 underline text-lg hover:text-blue-800 transition"
        >
          ← Volver al dashboard
        </Link>

      </div>

    </div>
  )
}