"use client";

import Link from "next/link";
import EntrarFacilLoginButton from "@/components/EntrarFacilLoginButton";

export default function LandingClient({
  auth,
}: {
  auth?: string;
}) {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">

      <div className="w-full max-w-md mx-auto">

        <div className="bg-white rounded-3xl p-10 shadow-md text-center">

          {auth === "required" && (
            <div className="mb-6 p-4 rounded-xl border border-yellow-300 bg-yellow-50 text-yellow-800 text-base font-semibold">
              🔐 Debe iniciar sesión para continuar.
            </div>
          )}

          {auth === "expired" && (
            <div className="mb-6 p-4 rounded-xl border border-red-300 bg-red-50 text-red-800 text-base font-semibold">
              ⏳ Su sesión ha expirado. Inicie sesión nuevamente.
            </div>
          )}

          <h1 className="text-4xl font-bold text-blue-600 mb-4">
            🩺 Enlace Salud
          </h1>

          <p className="text-gray-600 mb-8 leading-relaxed">
            Accede a tus documentos médicos de forma segura,
            sencilla y confiable desde cualquier lugar.
          </p>

          <div className="mb-6">
            <EntrarFacilLoginButton />

            <p className="text-sm text-gray-600 mt-3">
              Acceso seguro con huella o rostro.
              <br />
              <span className="font-semibold">Cumple con HIPAA.</span>
            </p>
          </div>

          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-gray-300" />
            <span className="text-gray-400 text-sm">o</span>
            <div className="flex-1 h-px bg-gray-300" />
          </div>

          <Link
            href="/login"
            className="block w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl text-lg font-semibold transition mb-4"
          >
            Entrar
          </Link>

          <Link
            href="/signup"
            className="block w-full border-2 border-blue-600 text-blue-600 py-4 rounded-xl text-lg font-medium hover:bg-blue-50 transition"
          >
            Crear cuenta
          </Link>

          <p className="text-xs text-gray-500 mt-6">
            Tus datos están protegidos. Diseñado para pacientes y cuidadores.
          </p>

        </div>
      </div>
    </div>
  );
}