'use client'

import { useCallback, useEffect, useState } from 'react'

type Grant = {
  id: string
  status: 'ACTIVE' | 'REVOKED' | 'EXPIRED'
  scope: 'READ_RECORD' | 'READ_AND_UPLOAD' | 'READ_UPLOAD_CATEGORIZE'
  validUntil: string | null
  revokedAt: string | null
  createdAt: string
  doctor: { id: string; fullName: string }
  organization: { id: string; name: string; status: string }
}

const permissionLabels: Record<Grant['scope'], string> = {
  READ_RECORD: 'Consultar mi expediente',
  READ_AND_UPLOAD: 'Consultar y subir estudios',
  READ_UPLOAD_CATEGORIZE: 'Consultar, subir y categorizar estudios',
}

function isEffective(grant: Grant) {
  return grant.status === 'ACTIVE' &&
    grant.organization.status === 'ACTIVE' &&
    (!grant.validUntil || new Date(grant.validUntil).getTime() > Date.now())
}

export default function AuthorizedDoctorsManager() {
  const [grants, setGrants] = useState<Grant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/multitenant/my-grants', {
        credentials: 'same-origin',
        cache: 'no-store',
      })
      if (!response.ok) throw new Error('No fue posible consultar las autorizaciones.')
      const data: { grants?: Grant[] } = await response.json()
      if (!Array.isArray(data.grants)) throw new Error('Respuesta inesperada.')
      setGrants(data.grants)
    } catch {
      setError('No pudimos cargar tus médicos autorizados. Intenta nuevamente.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  async function revoke(grantId: string) {
    if (busyId) return
    setBusyId(grantId)
    setError('')
    try {
      const response = await fetch('/api/multitenant/my-grants/revoke', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grantId }),
      })
      if (!response.ok) throw new Error('Revocation failed')
      setPendingId(null)
      await load()
    } catch {
      setError('No se pudo retirar el acceso. Intenta nuevamente.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section aria-labelledby="authorized-doctors-title" className="space-y-4">
      <div>
        <h2 id="authorized-doctors-title" className="text-xl font-semibold">
          Mis médicos autorizados
        </h2>
        <p className="text-sm text-gray-600">
          Tú decides qué médicos pueden consultar tu historial médico.
        </p>
      </div>
      {error && <p role="alert" className="text-red-700">{error}</p>}
      {loading ? <p role="status">Cargando autorizaciones...</p> :
        grants.length === 0 ? <p>No tienes autorizaciones registradas.</p> :
        <ul className="space-y-3">
          {grants.map(grant => {
            const effective = isEffective(grant)
            return (
              <li key={grant.id} className="rounded-lg border p-4 space-y-2">
                <div className="font-semibold">{grant.doctor.fullName}</div>
                <div className="text-sm">{grant.organization.name}</div>
                <div className="text-sm">Permiso: {permissionLabels[grant.scope]}</div>
                <div className="text-sm">
                  Estado: {grant.status === 'REVOKED' ? 'Revocado' :
                    effective ? 'Autorizado' : 'No vigente'}
                </div>
                {grant.validUntil && <div className="text-sm">
                  Vence: {new Date(grant.validUntil).toLocaleDateString('es-PR')}
                </div>}
                {grant.status === 'ACTIVE' && (
                  pendingId === grant.id ?
                    <div className="space-y-2">
                      <p className="text-sm">
                        ¿Confirmas que deseas retirar el acceso de este médico?
                      </p>
                      <div className="flex gap-2">
                        <button type="button" disabled={busyId !== null}
                          onClick={() => void revoke(grant.id)}
                          className="rounded bg-red-700 px-3 py-2 text-white disabled:opacity-50">
                          {busyId === grant.id ? 'Retirando...' : 'Sí, retirar acceso'}
                        </button>
                        <button type="button" disabled={busyId !== null}
                          onClick={() => setPendingId(null)}
                          className="rounded border px-3 py-2">Cancelar</button>
                      </div>
                    </div> :
                    <button type="button" disabled={busyId !== null}
                      onClick={() => setPendingId(grant.id)}
                      className="rounded border border-red-700 px-3 py-2 text-red-700 disabled:opacity-50">
                      Retirar acceso
                    </button>
                )}
              </li>
            )
          })}
        </ul>
      }
      <button type="button" onClick={() => void load()} disabled={loading || busyId !== null}
        className="rounded border px-3 py-2 disabled:opacity-50">
        Actualizar lista
      </button>
    </section>
  )
}
