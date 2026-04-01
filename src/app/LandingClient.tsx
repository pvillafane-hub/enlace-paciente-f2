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
          <div className="mb-8 p-6 rounded-2xl border border-yellow-300 bg-yellow-50 text-yellow-800 text-lg font-semibold">
            🔐 Debe iniciar sesión para continuar.
          </div>
        )}

        {authRequired === "expired" && (
          <div className="mb-8 p-6 rounded-2xl border border-red-300 bg-red-50 text-red-800 text-lg font-semibold">
            ⏳ Su sesión ha expirado. Inicie sesión nuevamente.
          </div>
        )}

        <h1 className="text-4xl font-bold mb-6 text-blue-700">
          🩺 Enlace Salud
        </h1>

        <div className="flex flex-col gap-6">
          <EntrarFacilLoginButton />

          <Link href="/login" className="bg-blue-600 text-white py-4 rounded-xl">
            Entrar
          </Link>

          <Link href="/signup" className="border py-4 rounded-xl">
            Crear cuenta
          </Link>
        </div>

      </div>
    </div>
  );
}