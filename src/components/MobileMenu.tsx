"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function MobileMenu({
  isDoctor,
  isAdmin,
  alerts,
  NotificationBell,
  logout,
}: any) {

  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      {/* ☰ SOLO MOBILE */}
      <button
        onClick={() => setOpen(true)}
        className="md:hidden text-2xl"
      >
        ☰
      </button>

      {open && (
        <div className="fixed inset-0 z-[999]">

          {/* BACKDROP */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
          />

          {/* PANEL */}
          <div className="absolute left-0 top-0 h-full w-64 bg-white p-6 flex flex-col gap-6 shadow-xl">

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
    </>
  );
}