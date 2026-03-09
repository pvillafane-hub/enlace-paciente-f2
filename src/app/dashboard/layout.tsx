'use client'

import { useState } from "react"
import Link from "next/link"
import { logout } from "@/app/logout/actions"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {

  const [menuOpen, setMenuOpen] = useState(false)

  return (

    <div className="min-h-screen bg-gray-50">

      {/* NAVBAR */}

      <nav className="bg-white border-b">

        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">

          {/* LOGO */}

          <Link
            href="/dashboard"
            className="text-2xl font-bold text-blue-700"
          >
            Enlace Salud
          </Link>

          {/* DESKTOP MENU */}

          <div className="hidden md:flex items-center gap-8 text-lg">

            <Link href="/dashboard" className="hover:text-blue-600">
              Inicio
            </Link>

            <Link href="/dashboard/view" className="hover:text-blue-600">
              Mis documentos
            </Link>

            <Link href="/dashboard/security" className="hover:text-blue-600">
              Seguridad
            </Link>

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

              <Link href="/dashboard/view" onClick={() => setMenuOpen(false)}>
                Mis documentos
              </Link>

              <Link href="/dashboard/security" onClick={() => setMenuOpen(false)}>
                Seguridad
              </Link>

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