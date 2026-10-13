'use client'
import { useState, useEffect, useRef, useId } from 'react'
import Link from 'next/link'
import { parseAlertSummary, alertMessage, type AlertSummary } from '@/lib/alert-summary'
export default function NotificationBell({ summary: initialSummary, variant = 'desktop' }: { summary: AlertSummary; variant?: 'desktop' | 'mobile' }) {
  const [summary, setSummary] = useState(initialSummary)
  const [error, setError] = useState(initialSummary.status === 'error' ? 'No se pudieron cargar las alertas.' : '')
  const [open, setOpen] = useState(false)
  const [retry, setRetry] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null), buttonRef = useRef<HTMLButtonElement>(null), panelRef = useRef<HTMLDivElement>(null)
  const id = useId()
  useEffect(() => {
    let disposed = false, busy = false
    let controller: AbortController | null = null
    const media = window.matchMedia('(min-width: 768px)')
    const visible = () => document.visibilityState === 'visible' && (variant === 'desktop' ? media.matches : !media.matches)
    async function refresh() {
      if (!visible() || busy) return
      busy = true; controller = new AbortController()
      try {
        const response = await fetch('/api/alerts', { cache: 'no-store', signal: controller.signal })
        if (disposed) return
        if (response.status === 401 || response.status === 403) {
          setSummary({ status: 'error', alerts: [], total: 0 }); setError(response.status === 401 ? 'Tu sesión terminó. Vuelve a iniciar sesión.' : 'Ya no tienes acceso a estas alertas.'); return
        }
        if (!response.ok) throw new Error('Update failed')
        const next = parseAlertSummary(await response.json())
        if (!next) throw new Error('Invalid response')
        if (!disposed) { setSummary(next); setError('') }
      } catch {
        if (!disposed) { setSummary({ status: 'error', alerts: [], total: 0 }); setError('No se pudieron actualizar las alertas. Intenta nuevamente.') }
      } finally { busy = false }
    }
    void refresh()
    const interval = setInterval(() => { void refresh() }, 30000)
    const resume = () => { void refresh() }
    document.addEventListener('visibilitychange', resume); media.addEventListener('change', resume)
    return () => { disposed = true; controller?.abort(); clearInterval(interval); document.removeEventListener('visibilitychange', resume); media.removeEventListener('change', resume) }
  }, [variant, retry, open])
  useEffect(() => {
    if (!open) return
    panelRef.current?.focus()
    const outside = (event: PointerEvent) => { if (!rootRef.current?.contains(event.target as Node)) setOpen(false) }
    const keydown = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.stopPropagation(); setOpen(false); buttonRef.current?.focus() } }
    document.addEventListener('pointerdown', outside); rootRef.current?.addEventListener('keydown', keydown)
    const root = rootRef.current
    return () => { document.removeEventListener('pointerdown', outside); root?.removeEventListener('keydown', keydown) }
  }, [open])
  return <div ref={rootRef} className="relative">
    <button ref={buttonRef} type="button" onClick={() => setOpen(value => !value)} aria-label={error ? 'Alertas: actualización no disponible' : summary.status === 'license-required' ? 'Alertas: licencia requerida' : `Alertas: ${summary.total} pendientes`} aria-expanded={open} aria-controls={id} className="relative min-h-12 min-w-12 text-2xl">
      🔔{summary.total > 0 && !error && <span aria-hidden="true" className="absolute -top-1 -right-1 rounded-full bg-red-700 px-2 py-0.5 text-sm text-white">{summary.total > 99 ? '99+' : summary.total}</span>}
    </button>
    {open && <div ref={panelRef} id={id} tabIndex={-1} role="region" aria-label="Alertas del doctor" className={variant === 'mobile' ? 'mt-3 w-full rounded-xl border bg-white shadow-lg' : 'absolute right-0 mt-3 w-80 max-w-[calc(100vw-2rem)] rounded-xl border bg-white shadow-lg z-50'}>
      <div className="flex items-center justify-between gap-3 border-b p-4"><h2 className="text-lg font-semibold">Alertas pendientes</h2><button type="button" aria-label="Cerrar alertas" onClick={() => { setOpen(false); buttonRef.current?.focus() }} className="min-h-12 min-w-12 text-xl">×</button></div>
      {error ? <div className="p-4 space-y-3"><p role="alert">{error}</p><button type="button" onClick={() => setRetry(value => value + 1)} className="min-h-12 rounded-xl border px-4 py-3">Actualizar</button></div> : summary.status === 'license-required' ? <p role="status" className="p-4">Las alertas requieren una licencia activa. Consulta tu estado desde Inicio.</p> : <>
        <p role="status" className="p-4 text-gray-700">{summary.total ? `${summary.total} pendientes · Mostrando ${summary.alerts.length}` : 'No hay alertas pendientes registradas.'}</p>
        <div className="max-h-[50dvh] overflow-y-auto overscroll-contain">{summary.alerts.map(alert => <Link key={alert.id} href={`/dashboard/patients/${alert.patientId}`} onClick={() => setOpen(false)} className="block border-t p-4 hover:bg-gray-50">
          <div className="min-w-0 [overflow-wrap:anywhere]"><p className="font-semibold">{alert.patientName}</p><p className="text-gray-700 mt-1">{alertMessage(alert.type)}</p><p className="text-sm text-gray-700 mt-1">Registrada: {new Date(alert.createdAt).toLocaleDateString('es-PR', { timeZone: 'America/Puerto_Rico' })}</p><p className="mt-2 text-blue-800">Ir al expediente →</p></div>
        </Link>)}</div>
        <div className="border-t p-4"><Link href="/dashboard/alerts" onClick={() => setOpen(false)} className="inline-flex min-h-12 items-center font-semibold text-blue-800 underline">Ver todas las alertas</Link><p className="text-sm text-gray-700">Abrir el expediente no marca la alerta como resuelta.</p></div>
      </>}
    </div>}
  </div>
}
