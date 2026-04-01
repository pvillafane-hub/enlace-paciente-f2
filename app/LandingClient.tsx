"use client";

import Link from "next/link";
import EntrarFacilLoginButton from "@/components/EntrarFacilLoginButton";

export default function LandingClient({
  auth,
}: {
  auth?: string;
}) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
      <div className="bg-white/95 backdrop-blur rounded-3xl p-12 shadow-soft max-w-4xl w-full text-center">

        {/* ALERTAS */}
        {auth === "required" && (
          <div className="mb-8 p-6 rounded-2xl border border-yellow-300 bg-yellow-50 text-yellow-800 text-lg font-semibold">
            🔐 Debe iniciar sesión para continuar.
          </div>
        )}

        {auth === "expired" && (
          <div className="mb-8 p-6 rounded-2xl border border-red-300 bg-red-50 text-red-800 text-lg font-semibold">
            ⏳ Su sesión ha expirado. Inicie sesión nuevamente.
          </div>
        )}

        {/* HEADER */}
        <h1 className="text-5xl font-bold mb-6 text-blue-700">
          🩺 Enlace Salud
        </h1>

        <p className="text-xl text-gray-700 mb-12">
          Accede a tus documentos médicos de forma segura,
          sencilla y confiable desde cualquier lugar.
        </p>

        {/* GRID PRINCIPAL */}
        <div className="grid md:grid-cols-3 gap-8 items-center">

          {/* ENTRAR FÁCIL */}
          <div className="flex flex-col items-center gap-3">
            <EntrarFacilLoginButton />

            <p className="text-sm text-gray-600 text-center">
              Acceso con huella o rostro.
              <br />
              <span className="font-medium">Cumple HIPAA.</span>
            </p>
          </div>

          {/* BOTÓN ENTRAR */}
          <Link
            href="/login"
            className="bg-blue-600 hover:bg-blue-700 text-white py-6 rounded-2xl text-2xl font-semibold transition text-center"
          >
            Entrar
          </Link>

          {/* CREAR CUENTA */}
          <Link
            href="/signup"
            className="border-2 border-blue-600 text-blue-700 py-6 rounded-2xl text-xl font-medium hover:bg-blue-50 transition text-center"
          >
            Crear cuenta
          </Link>

        </div>

        {/* FOOTER */}
        <p className="text-sm text-gray-500 mt-10">
          Tus datos están protegidos. Diseñado para pacientes y cuidadores.
        </p>

      </div>
    </div>
  );
}