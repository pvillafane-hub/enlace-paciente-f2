'use client'

import { useCallback, useEffect, useState, type FormEvent } from 'react'

type Clinic = { id: string; name: string }
type Doctor = { id: string; fullName: string }
type Grant = {
  id: string
  status: 'ACTIVE' | 'REVOKED' | 'EXPIRED'
  effective: boolean
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

export default function AuthorizedDoctorsManager() {
  const [grants, setGrants] = useState<Grant[]>([])
  const [clinics, setClinics] = useState<Clinic[]>([])
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [clinicId, setClinicId] = useState('')
  const [doctorId, setDoctorId] = useState('')
  const [scope, setScope] = useState<Grant['scope']>('READ_RECORD')
  const [grantBusy, setGrantBusy] = useState(false)
  const [directoryLoading, setDirectoryLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  const [error, setError] = useState('')
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadFailed(false)
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
      // Never present cached permissions as current after a failed refresh.
      setGrants([])
      setLoadFailed(true)
      setError('No pudimos cargar tus médicos autorizados. Intenta nuevamente.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  useEffect(() => {
    let active = true
    void fetch('/api/multitenant/my-clinics', { cache: 'no-store' })
      .then(response => { if (!response.ok) throw new Error('clinics'); return response.json() })
      .then((data: { organizations: Clinic[] }) => { if (active) setClinics(data.organizations) })
      .catch(() => { if (active) setError('No pudimos cargar tus clínicas.') })
    return () => { active = false }
  }, [])

  useEffect(() => {
    let active = true
    setDoctors([])
    setDoctorId('')
    setDirectoryLoading(Boolean(clinicId))
    if (clinicId) {
      void fetch('/api/multitenant/clinic-doctors?organizationId=' + encodeURIComponent(clinicId),
        { cache: 'no-store' })
        .then(response => { if (!response.ok) throw new Error('doctors'); return response.json() })
        .then((data: { doctors: Doctor[] }) => { if (active) setDoctors(data.doctors) })
        .catch(() => { if (active) setError('No pudimos cargar los médicos.') })
        .finally(() => { if (active) setDirectoryLoading(false) })
    }
    return () => { active = false }
  }, [clinicId])

  async function authorize(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!clinicId || !doctorId || grantBusy || directoryLoading ||
        !doctors.some(doctor => doctor.id === doctorId)) return
    setGrantBusy(true)
    setError('')
    try {
      const response = await fetch('/api/multitenant/my-grants/grant', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: clinicId, doctorId, scope }),
      })
      if (response.status === 409) {
        await load()
        throw new Error('ALREADY_GRANTED')
      }
      if (!response.ok) throw new Error('grant')
      setDoctorId('')
      await load()
    } catch (err) {
      setError(err instanceof Error && err.message === 'ALREADY_GRANTED'
        ? 'Este médico ya tiene una autorización activa. Revisa la lista antes de intentar nuevamente.'
        : 'No se pudo autorizar al médico. Intenta nuevamente.')
    } finally {
      setGrantBusy(false)
    }
  }

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
      <form onSubmit={event => void authorize(event)} className="space-y-3 rounded-lg border p-4">
        <h3 className="font-semibold">Autorizar a un médico</h3>
        <label htmlFor="clinic-select" className="block text-sm">Clínica</label>
        <select id="clinic-select" value={clinicId} onChange={event => {
          setDoctors([])
          setDoctorId('')
          setDirectoryLoading(Boolean(event.target.value))
          setClinicId(event.target.value)
        }}
          required disabled={grantBusy} className="w-full rounded border p-2">
          <option value="">Selecciona tu clínica</option>
          {clinics.map(clinic => <option key={clinic.id} value={clinic.id}>{clinic.name}</option>)}
        </select>
        <label htmlFor="doctor-select" className="block text-sm">Médico</label>
        <select id="doctor-select" value={doctorId} onChange={event => setDoctorId(event.target.value)}
          required disabled={!clinicId || directoryLoading || grantBusy} className="w-full rounded border p-2">
          <option value="">{directoryLoading ? 'Cargando médicos...' : 'Selecciona un médico'}</option>
          {doctors.map(doctor => <option key={doctor.id} value={doctor.id}>{doctor.fullName}</option>)}
        </select>
        <label htmlFor="scope-select" className="block text-sm">¿Qué puede hacer?</label>
        <select id="scope-select" value={scope}
          onChange={event => setScope(event.target.value as Grant['scope'])}
          disabled={grantBusy} className="w-full rounded border p-2">
          {Object.entries(permissionLabels).map(([value, label]) =>
            <option key={value} value={value}>{label}</option>)}
        </select>
        <p className="text-xs text-gray-600">
          Solo aparecen clínicas asociadas a tu cuenta. Puedes retirar el permiso cuando quieras.
        </p>
        <button type="submit" disabled={!doctorId || grantBusy || directoryLoading || !doctors.some(doctor => doctor.id === doctorId)}
          className="rounded bg-blue-700 px-4 py-2 text-white disabled:opacity-50">
          {grantBusy ? 'Guardando...' : 'Autorizar médico'}
        </button>
      </form>
      {error && <p role="alert" className="text-red-700">{error}</p>}
      {loading ? <p role="status">Cargando autorizaciones...</p> :
        loadFailed ? <p role="status">No se pudo verificar el estado actual de tus autorizaciones.</p> :
        grants.length === 0 ? <p>No tienes autorizaciones registradas.</p> :
        <ul className="space-y-3">
          {grants.map(grant => {
            const effective = grant.effective
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
