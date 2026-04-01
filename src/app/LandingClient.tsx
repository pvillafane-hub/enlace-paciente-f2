"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import EntrarFacilLoginButton from "@/components/EntrarFacilLoginButton";

export default function LandingClient() {
  const searchParams = useSearchParams();
  const authRequired = searchParams?.get("auth");

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
      <div className="bg-white/95 backdrop-blur rounded-3xl p-12 shadow-soft max-w-xl w-full text-center">

        {authRequired === "required" && (
          <div className="mb-8 p-6 rounded-2xl border border-yellow-300 bg-yellow-50 text-yellow-800 text-lg font-semibold animate-fadeIn">
            🔐 Debe iniciar sesión para continuar.
          </div>
        )}
        
        {authRequired === "expired" && (
          <div className="mb-8 p-6 rounded-2xl border border-red-300 bg-red-50 text-red-800 text-lg font-semibold animate-fadeIn">
            ⏳ Su sesión ha expirado. Inicie sesión nuevamente.
          </div>
        )}
        
        <h1 className="text-4xl md:text-5xl font-bold mb-6 text-blue-700">
          🩺 Enlace Salud
        </h1>

        <p className="text-xl text-gray-700 mb-10">
          Accede a tus documentos médicos de forma segura,
          sencilla y confiable desde cualquier lugar.
        </p>

        <div className="flex flex-col gap-8">

          <div className="flex flex-col items-center gap-3">
            <EntrarFacilLoginButton />
            <p className="text-base text-gray-700">
              Acceso seguro con huella o rostro.
              <br />
              <span className="font-medium">Cumple con HIPAA.</span>
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-gray-400 text-sm">o</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <Link
            href="/login"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-5 rounded-2xl text-2xl font-semibold transition block"
          >
            Entrar
          </Link>

          <Link
            href="/signup"
            className="w-full border-2 border-blue-600 text-blue-700 py-5 rounded-2xl text-xl font-medium hover:bg-blue-50 transition block"
          >
            Crear cuenta
          </Link>
        </div>

        <p className="text-sm text-gray-500 mt-6">
          Tus datos están protegidos. Diseñado para pacientes y cuidadores.
        </p>

      </div>
    </div>
  );
}