"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

export default function MobileMenu({
  isDoctor,
  isAdmin,
  isStaff = false,
  alertSummary,
  NotificationBell,
  logout,
}: any) {

  const [open, setOpen] = useState(false);

  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    panelRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
    function keydown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
      if (event.key !== 'Tab') return;
      const controls = panelRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled])');
      if (!controls?.length) return;
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    document.addEventListener('keydown', keydown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', keydown);
      previousFocus?.focus();
    };
  }, [open]);

  return (
    <>
      {/* ☰ SOLO MOBILE */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Abrir menú" aria-expanded={open} aria-controls="mobile-navigation"
        className="md:hidden min-h-12 min-w-12 text-2xl"
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
          <div ref={panelRef} id="mobile-navigation" role="dialog" aria-modal="true" aria-label="Menú de navegación" className="absolute left-0 top-0 h-dvh max-h-full w-72 max-w-[90vw] overflow-y-auto overscroll-contain bg-white p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] flex flex-col gap-5 shadow-xl [&_a]:min-h-12 [&_a]:flex [&_a]:items-center">

            <button
              onClick={() => setOpen(false)}
              aria-label="Cerrar menú" className="self-end min-h-12 min-w-12 text-xl"
            >
              ✕
            </button>

            {!isAdmin && <Link href="/dashboard" onClick={() => setOpen(false)}>Inicio</Link>}

            {!isDoctor && !isAdmin && !isStaff && (
              <>
                <Link href="/dashboard/doctors" onClick={() => setOpen(false)}>Mis doctores</Link>
                <Link href="/dashboard/security" onClick={() => setOpen(false)}>Seguridad</Link>
                <Link href="/dashboard/qr" onClick={() => setOpen(false)}>Mostrar código</Link>
              </>
            )}

            {(isDoctor || isStaff) && (
              <>
                <Link href="/dashboard/patients" onClick={() => setOpen(false)}>Pacientes</Link>
                {isDoctor && <Link href="/dashboard/requests" onClick={() => setOpen(false)}>Solicitudes</Link>}
                {isDoctor && <Link href="/dashboard/reports" onClick={() => setOpen(false)}>Reportes</Link>}
              </>
            )}

            {isAdmin && (
              <>
                <Link href="/dashboard/admin/users" onClick={() => setOpen(false)}>Usuarios</Link>
                <Link href="/dashboard/admin/licenses" onClick={() => setOpen(false)}>Licencias</Link>
                <Link href="/dashboard/admin/logs" onClick={() => setOpen(false)}>Logs</Link>
                <Link href="/dashboard/admin/alerts" onClick={() => setOpen(false)}>Alertas</Link>
              </>
            )}

            {isDoctor && <NotificationBell summary={alertSummary} variant="mobile" />}

            <form action={logout}>
              <button className="text-red-600">Salir</button>
            </form>

          </div>
        </div>
      )}
    </>
  );
}