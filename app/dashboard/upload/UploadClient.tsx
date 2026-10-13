'use client'

import { useRouter } from 'next/navigation'
import { useState, useRef } from 'react'
import { uploadSelectionError, MOBILE_UPLOAD_MAX_BYTES } from '@/lib/mobile-upload-policy'
import imageCompression from "browser-image-compression"

export default function UploadClient({ patientId, patientName, patientBirth, returnPath, representative }: { patientId: string | null; patientName: string; patientBirth: string; returnPath: string; representative: boolean }) {

  const router = useRouter()

  // 🔥 NUEVO: paciente destino cuando doctor/staff sube desde el perfil del paciente

  const [loading, setLoading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const selectionVersion = useRef(0)
  const cameraRef = useRef<HTMLInputElement>(null)
  const [saved, setSaved] = useState(false)

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [bodyPart, setBodyPart] = useState("")
  const [docType, setDocType] = useState("")
  const [specialty, setSpecialty] = useState("")

  const [errors, setErrors] = useState<{
    file?: string
    docType?: string
    facility?: string
    studyDate?: string
    specialty?: string
  }>({})

  const [fileName, setFileName] = useState("Ningún archivo seleccionado")

  const fileRef = useRef<HTMLInputElement>(null)
  const docTypeRef = useRef<HTMLSelectElement>(null)
  const facilityRef = useRef<HTMLInputElement>(null)
  const dateRef = useRef<HTMLInputElement>(null)

  async function selectFile(file?: File) {
    if (!file) return
    const version = ++selectionVersion.current
    setSelectedFile(null); setFileName('Preparando archivo…'); setProcessing(true)
    setErrors(prev => ({ ...prev, file: undefined }))
    try {
      const invalid = uploadSelectionError(file)
      if (invalid) throw new Error(invalid)
      let prepared = file
      if (file.type.startsWith('image/')) {
        try { prepared = await imageCompression(file, { maxSizeMB: 1, maxWidthOrHeight: 1600, useWebWorker: true, fileType: 'image/jpeg' }) }
        catch { prepared = file }
      }
      if (prepared.size > MOBILE_UPLOAD_MAX_BYTES) throw new Error('El archivo supera 4 MB. Selecciona uno más pequeño o toma una foto.')
      if (version === selectionVersion.current) { setSelectedFile(prepared); setFileName(file.name) }
    } catch (error) {
      if (version === selectionVersion.current) { setFileName('Ningún archivo seleccionado'); setErrors(prev => ({ ...prev, file: error instanceof Error ? error.message : 'No se pudo preparar el archivo.' })) }
    } finally { if (version === selectionVersion.current) setProcessing(false) }
  }

  function validateField(name: string, value: any) {

    let message = ''

    if (name === 'docType') {
      if (!value || value === "") {
        message = "Seleccione el tipo de documento."
      }
    }

    if (name === 'facility') {
      if (!value || value.trim() === '') {
        message = "Escriba el hospital o clínica."
      }
    }

    if (name === 'studyDate') {
      if (!value) {
        message = "Seleccione la fecha del estudio."
      }
    }

    setErrors(prev => ({
      ...prev,
      [name]: message || undefined
    }))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {

    e.preventDefault()
    if (loading || processing || saved) return

    setErrors({})
    setSaved(false)
    setLoading(true)

    const formData = new FormData(e.currentTarget)

    if (selectedFile) {
      formData.set('file', selectedFile)
    }

    // 🔥 NUEVO: enviar patientId al endpoint si viene desde /dashboard/upload?patientId=...
    if (patientId) {
      formData.set('patientId', patientId)
    }

    const docType = formData.get('docType') as string
    const facility = formData.get('facility') as string
    const studyDate = formData.get('studyDate')

    const newErrors: typeof errors = {}

    const isImaging =
      docType === "Radiografia" || docType === "Imagenes"

    const isLab = docType === "Laboratorio"

    if (isLab && !specialty) {
      newErrors.specialty = "Seleccione la especialidad médica."
    }

    if (isImaging && !bodyPart) {
      newErrors.docType = "Seleccione la parte del cuerpo del estudio."
    }

    if (!selectedFile) {
      newErrors.file = "Por favor, seleccione el documento que desea subir."
    }

    if (!docType || docType === "") {
      newErrors.docType = "Seleccione el tipo de documento."
    }

    if (!facility || facility.trim() === "") {
      newErrors.facility = "Escriba el hospital o clínica."
    }

    if (!studyDate) {
      newErrors.studyDate = "Seleccione la fecha del estudio."
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      setLoading(false)
      return
    }

    try {

      if (bodyPart) {
        formData.append('bodyPart', bodyPart)
      }

      if (specialty) {
        formData.append('specialty', specialty)
      }

      const res = await fetch('/api/upload/create', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      })

      if (res.status === 401) {
        router.push('/?auth=expired')
        return
      }

      if (res.ok) {

        setSaved(true)

        setTimeout(() => {
          // 🔥 NUEVO: si subió documento para paciente, volver al perfil del paciente
          if (patientId) {
            router.push(returnPath)
          } else {
            router.push('/dashboard')
          }

          router.refresh()
        }, 1500)

      } else {
        const result = await res.json().catch(() => null)
        setErrors({ file: result?.error || (res.status === 413 ? 'El archivo es demasiado grande. Selecciona uno de hasta 4 MB.' : 'No se pudo guardar el documento. Intente nuevamente.') })
      }

    } catch {
      setErrors({
        file: "Ocurrió un problema inesperado."
      })
    }

    setLoading(false)
  }

  return (
    <div className="max-w-2xl mx-auto">

      <div className="bg-white rounded-2xl p-4 sm:p-8 shadow-md">

        <h2 className="text-3xl font-bold mb-4">
          {patientId ? "Subir documento del paciente" : "Subir estudio médico"}
        </h2>

        <p className="text-gray-600 text-lg mb-6">
          {patientId
            ? "Este documento se guardará directamente en el expediente del paciente seleccionado."
            : "Puede subir laboratorios, radiografías, medicamentos, vacunas o referidos médicos."}
        </p>

        {patientId && (
          <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4 text-blue-800">
            <p className="font-semibold">
              Documento para {patientName}
            </p>
            <p className="text-sm mt-1">
              Nacimiento: {patientBirth}. Confirma que corresponde a la persona correcta antes de guardar.
            </p>
          </div>
        )}

        {representative && <p className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4">El documento se enviará a la clínica. Quedará privado para representantes hasta que la clínica revise si puede compartirse.</p>}

        {saved && (
          <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4 text-green-800">
            Documento guardado correctamente.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">

          {/* ARCHIVO */}

          <label className="block text-lg font-semibold">

            📄 Archivo

            <input
              ref={fileRef}
              type="file"
              name="file"
              accept="image/jpeg,image/png,image/webp,.pdf"
              disabled={loading || processing || saved}
              onChange={e => { void selectFile(e.target.files?.[0]); e.target.value = '' }}
              className="mt-3 block w-full"
            />

            <input ref={cameraRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="sr-only" tabIndex={-1} aria-label="Tomar foto del documento" onChange={e => { void selectFile(e.target.files?.[0]); e.target.value = '' }} />
            <button type="button" disabled={loading || processing || saved} onClick={() => cameraRef.current?.click()} className="mt-4 min-h-12 w-full rounded-xl border border-blue-700 px-4 py-3 text-blue-800 disabled:opacity-50">Tomar una foto</button>
            <p role="status" className="text-gray-600 break-words">{processing ? 'Preparando foto. Espera antes de guardar.' : fileName}</p><p className="text-sm text-gray-500">PDF, JPEG, PNG o WebP; máximo 4 MB.</p>

            {errors.file && (
              <p role="alert" className="mt-2 text-red-700 font-semibold">
                ⚠ {errors.file}
              </p>
            )}

          </label>

          {/* TIPO */}

          <label className="block text-lg font-semibold">

            🧾 Tipo de estudio

            <select
              ref={docTypeRef}
              name="docType"
              value={docType}
              onChange={(e) => {
                const value = e.target.value
                setDocType(value)
                validateField('docType', value)

                if (value !== "Radiografia" && value !== "Imagenes") {
                  setBodyPart("")
                }

                if (value !== "Laboratorio") {
                  setSpecialty("")
                }
              }}
              className="mt-2 w-full p-4 text-lg border rounded-lg"
            >

              <option value="">Seleccione tipo de documento</option>
              <option value="Laboratorio">Laboratorio</option>
              <option value="Radiografia">Radiología / Imagen</option>
              <option value="Medicamentos">Medicamentos</option>
              <option value="Vacunas">Vacunas</option>
              <option value="Referidos">Referidos</option>
              <option value="Implantes">Implantes</option>
              <option value="Otro">Otro documento</option>

            </select>

            {errors.docType && (
              <p role="alert" className="mt-2 text-red-700 font-semibold">
                ⚠ {errors.docType}
              </p>
            )}

          </label>

          {/* BODY PART */}

          {(docType === "Radiografia" || docType === "Imagenes") && (
            <div>

              <p className="text-lg font-semibold mt-2">
                ¿De qué parte del cuerpo es este estudio?
              </p>

              <div className="grid grid-cols-2 gap-3 mt-3">
                {[
                  { label: "Cabeza", value: "cabeza" },
                  { label: "Cuello", value: "cuello" },
                  { label: "Pecho", value: "pecho" },
                  { label: "Abdomen", value: "abdomen" },
                  { label: "Brazos o piernas", value: "extremidades" },
                ].map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    aria-pressed={bodyPart === item.value}
                    onClick={() => setBodyPart(item.value)}
                    className={`p-4 rounded-xl border text-sm font-medium ${
                      bodyPart === item.value
                        ? "bg-blue-600 text-white"
                        : "bg-white"
                    }`}
                  >
                    {item.label}

                    {bodyPart === item.value && (
                      <div className="text-xs mt-1">✓ Seleccionado</div>
                    )}

                  </button>
                ))}
              </div>

            </div>
          )}

          {docType === "Laboratorio" && (
            <div>

              <p className="text-lg font-semibold mt-4">
                Especialidad médica
              </p>

              <select
                name="specialty"
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                className="mt-2 w-full p-4 text-lg border rounded-lg"
              >
                <option value="">Seleccione especialidad</option>

                <option value="cardiologia">Cardiología</option>
                <option value="endocrinologia">Endocrinología</option>
                <option value="nefrologia">Nefrología</option>
                <option value="hematologia_oncologia">Hematología / Oncología</option>
                <option value="urologia">Urología</option>
                <option value="reumatologia">Reumatología</option>
                <option value="neumologia">Neumología</option>
                <option value="geriatria">Geriatría</option>
                <option value="pediatria">Pediatría</option>

              </select>

              {errors.specialty && (
                <p role="alert" className="mt-2 text-red-700 font-semibold">
                  ⚠ {errors.specialty}
                </p>
              )}

            </div>
          )}

          {/* HOSPITAL */}

          <label className="block text-lg font-semibold">

            🏥 Hospital o clínica

            <input
              ref={facilityRef}
              type="text"
              name="facility"
              onChange={(e) => validateField('facility', e.target.value)}
              className="mt-2 w-full p-4 text-lg border rounded-lg"
            />

            {errors.facility && (
              <p role="alert" className="mt-2 text-red-700 font-semibold">
                ⚠ {errors.facility}
              </p>
            )}

          </label>

          {/* FECHA */}

          <label className="block text-lg font-semibold">

            📅 Fecha del estudio

            <input
              ref={dateRef}
              type="date"
              name="studyDate"
              onChange={(e) => validateField('studyDate', e.target.value)}
              className="mt-2 w-full p-4 text-lg border rounded-lg"
            />

            {errors.studyDate && (
              <p role="alert" className="mt-2 text-red-700 font-semibold">
                ⚠ {errors.studyDate}
              </p>
            )}

          </label>

          <button
            type="submit"
            disabled={loading || processing || saved}
            className="p-4 rounded-xl text-2xl font-semibold w-full bg-blue-600 text-white disabled:opacity-50"
          >
            {processing ? 'Preparando archivo…' : loading ? 'Guardando...' : saved ? 'Documento guardado' : 'Guardar estudio médico'}
          </button>

        </form>

      </div>

    </div>
  )
}