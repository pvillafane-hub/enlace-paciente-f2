'use client'

import { useState } from "react"
import Link from "next/link"
import { logout } from "@/app/logout/actions"

export default function DashboardLayout({
  children,
  role = "PATIENT"
}: {
  children: React.ReactNode
  role?: "PATIENT" | "DOCTOR"
}) {

  const [menuOpen, setMenuOpen] = useState(false)

  const isDoctor = role === "DOCTOR"

  return (

    <div className="min-h-screen bg-gray-50">

      {/* NAVBAR */}

      <nav className="bg-white border-b">

        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">

          {/* LOGO */}

          <div className="flex items-center gap-3">

            <Link
              href="/dashboard"
              className="text-2xl font-bold text-blue-700"
            >
              Enlace Salud
            </Link>

            {/* ROLE BADGE */}

            <span
              className={`text-xs px-3 py-1 rounded-full font-semibold ${
                isDoctor
                  ? "bg-purple-100 text-purple-700"
                  : "bg-green-100 text-green-700"
              }`}
            >
              {isDoctor ? "Doctor" : "Paciente"}
            </span>

          </div>


          {/* DESKTOP MENU */}

          <div className="hidden md:flex items-center gap-8 text-lg">

            <Link href="/dashboard" className="hover:text-blue-600">
              Inicio
            </Link>


            {/* PACIENTE */}

            {!isDoctor && (
              <>
                
                <Link href="/dashboard/doctors" className="hover:text-blue-600">
                  Mis doctores
                </Link>

                <Link href="/dashboard/security" className="hover:text-blue-600">
                  Seguridad
                </Link>
              </>
            )}


            {/* DOCTOR */}

            {isDoctor && (
              <>
                <Link href="/dashboard/patients" className="hover:text-blue-600">
                  Pacientes
                </Link>

                {/* NUEVO MÓDULO CLÍNICO */}

                <Link href="/dashboard/clinic" className="hover:text-blue-600">
                  Clínica
                </Link>

                <Link href="/dashboard/requests" className="hover:text-blue-600">
                  Solicitudes
                </Link>

                <Link href="/dashboard/reports" className="hover:text-blue-600">
                  Reportes
                </Link>
              </>
            )}

            <form action={logout}>
              <button className="text-red-600 text-left">
                Salir
              </button>
            </form>

          </div>


          {/* HAMBURGER */}

          <button
            className="md:hidden text-2xl"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            ☰
          </button>

        </div>


        {/* MOBILE MENU */}

        {menuOpen && (

          <div className="md:hidden border-t">

            <div className="flex flex-col gap-4 p-6 text-lg">

              <Link href="/dashboard" onClick={() => setMenuOpen(false)}>
                Inicio
              </Link>

              {!isDoctor && (
                <>

                  <Link href="/dashboard/doctors" onClick={() => setMenuOpen(false)}>
                    Mis doctores
                  </Link>

                  <Link href="/dashboard/security" onClick={() => setMenuOpen(false)}>
                    Seguridad
                  </Link>
                </>
              )}

              {isDoctor && (
                <>
                  <Link href="/dashboard/patients" onClick={() => setMenuOpen(false)}>
                    Pacientes
                  </Link>

                  {/* NUEVO MÓDULO */}

                  <Link href="/dashboard/clinic" onClick={() => setMenuOpen(false)}>
                    Clínica
                  </Link>

                  <Link href="/dashboard/requests" onClick={() => setMenuOpen(false)}>
                    Solicitudes
                  </Link>

                  <Link href="/dashboard/reports" onClick={() => setMenuOpen(false)}>
                    Reportes
                  </Link>
                </>
              )}

              <form action={logout}>
                <button className="text-red-600 text-left">
                  Salir
                </button>
              </form>

            </div>

          </div>

        )}

      </nav>


      {/* CONTENT */}

      <main className="max-w-6xl mx-auto p-8">
        {children}
      </main>

    </div>
  )
}