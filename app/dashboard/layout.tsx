"use client";

import { useState } from "react";
import Link from "next/link";

export default function DashboardNav({
  isDoctor,
  isAdmin,
  alerts,
  NotificationBell,
  logout,
}: any) {

  const [open, setOpen] = useState(false);

  return (
    <nav className="bg-white border-b">

      <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">

        <Link
          href="/dashboard"
          className="text-2xl font-bold text-blue-700"
        >
          Enlace Salud
        </Link>

        {/* 🔥 DESKTOP */}
        <div className="hidden md:flex items-center gap-8 text-lg">

          {!isAdmin && <Link href="/dashboard">Inicio</Link>}

          {!isDoctor && !isAdmin && (
            <>
              <Link href="/dashboard/doctors">Mis doctores</Link>
              <Link href="/dashboard/security">Seguridad</Link>
            </>
          )}

          {isDoctor && (
            <>
              <Link href="/dashboard/patients">Pacientes</Link>
              <Link href="/dashboard/requests">Solicitudes</Link>
              <Link href="/dashboard/reports">Reportes</Link>
            </>
          )}

          {isAdmin && (
            <>
              <Link href="/dashboard/admin/users">Usuarios</Link>
              <Link href="/dashboard/admin/logs">Logs</Link>
              <Link href="/dashboard/admin/alerts">Alertas</Link>
            </>
          )}

          {isDoctor && <NotificationBell alerts={alerts} />}

          <form action={logout}>
            <button className="text-red-600">Salir</button>
          </form>

        </div>

        {/* 🔥 MOBILE BUTTON */}
        <button
          onClick={() => setOpen(true)}
          className="md:hidden text-2xl"
        >
          ☰
        </button>

      </div>

      {/* 🔥 MOBILE MENU */}
      {open && (
        <div className="fixed inset-0 bg-black/40 z-50">

          <div className="bg-white w-64 h-full p-6 flex flex-col gap-6">

            <button
              onClick={() => setOpen(false)}
              className="self-end text-xl"
            >
              ✕
            </button>

            {!isAdmin && <Link href="/dashboard" onClick={() => setOpen(false)}>Inicio</Link>}

            {!isDoctor && !isAdmin && (
              <>
                <Link href="/dashboard/doctors" onClick={() => setOpen(false)}>Mis doctores</Link>
                <Link href="/dashboard/security" onClick={() => setOpen(false)}>Seguridad</Link>
              </>
            )}

            {isDoctor && (
              <>
                <Link href="/dashboard/patients" onClick={() => setOpen(false)}>Pacientes</Link>
                <Link href="/dashboard/requests" onClick={() => setOpen(false)}>Solicitudes</Link>
                <Link href="/dashboard/reports" onClick={() => setOpen(false)}>Reportes</Link>
              </>
            )}

            {isAdmin && (
              <>
                <Link href="/dashboard/admin/users" onClick={() => setOpen(false)}>Usuarios</Link>
                <Link href="/dashboard/admin/logs" onClick={() => setOpen(false)}>Logs</Link>
                <Link href="/dashboard/admin/alerts" onClick={() => setOpen(false)}>Alertas</Link>
              </>
            )}

            {isDoctor && <NotificationBell alerts={alerts} />}

            <form action={logout}>
              <button className="text-red-600">Salir</button>
            </form>

          </div>
        </div>
      )}

    </nav>
  );
}