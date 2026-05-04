'use client'

import { useRouter } from 'next/navigation'
import { useState, useRef } from 'react'
import imageCompression from "browser-image-compression"

export default function UploadPage() {

  const router = useRouter()

  const [loading, setLoading] = useState(false)
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

    setErrors({})
    setSaved(false)
    setLoading(true)

    const formData = new FormData(e.currentTarget)

    if (selectedFile) {
      formData.set('file', selectedFile)
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
          router.push('/dashboard')
          router.refresh()
        }, 1500)

      } else {
        setErrors({
          file: "No se pudo guardar el documento. Intente nuevamente."
        })
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

      <div className="bg-white rounded-2xl p-8 shadow-md">

        <h2 className="text-3xl font-bold mb-4">
          Subir estudio médico
        </h2>

        <p className="text-gray-600 text-lg mb-6">
          Puede subir laboratorios, radiografías, medicamentos, vacunas o referidos médicos.
        </p>

        <form onSubmit={handleSubmit} className="space-y-8">

          {/* ARCHIVO */}

          <label className="block text-lg font-semibold">

            📄 Archivo

            <input
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (!file) return

                setSelectedFile(file)
                setFileName(file.name)
              }}
              className="mt-3 block w-full"
            />

            <p className="text-gray-600">{fileName}</p>

            {errors.file && (
              <p className="mt-2 text-red-700 font-semibold">
                ⚠ {errors.file}
              </p>
            )}

          </label>

          {/* TIPO */}

          <label className="block text-lg font-semibold">

            🧾 Tipo de estudio

            <select
              name="docType"
              value={docType}
              onChange={(e) => {
                const value = e.target.value
                setDocType(value)
                validateField('docType', value)

                // 🔥 limpiar bodyPart si cambia
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
              <p className="mt-2 text-red-700 font-semibold">
                ⚠ {errors.docType}
              </p>
            )}

          </label>

          {/* 🔥 BODY PART (FUERA DEL SELECT) */}

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
               <p className="mt-2 text-red-700 font-semibold">
                 ⚠ {errors.specialty}
               </p>
             )}

           </div>
          )}

          {/* HOSPITAL */}

          <label className="block text-lg font-semibold">

            🏥 Hospital o clínica

            <input
              type="text"
              name="facility"
              onChange={(e) => validateField('facility', e.target.value)}
              className="mt-2 w-full p-4 text-lg border rounded-lg"
            />

            {errors.facility && (
              <p className="mt-2 text-red-700 font-semibold">
                ⚠ {errors.facility}
              </p>
            )}

          </label>

          {/* FECHA */}

          <label className="block text-lg font-semibold">

            📅 Fecha del estudio

            <input
              type="date"
              name="studyDate"
              onChange={(e) => validateField('studyDate', e.target.value)}
              className="mt-2 w-full p-4 text-lg border rounded-lg"
            />

            {errors.studyDate && (
              <p className="mt-2 text-red-700 font-semibold">
                ⚠ {errors.studyDate}
              </p>
            )}

          </label>

          <button
            type="submit"
            disabled={loading}
            className="p-4 rounded-xl text-2xl font-semibold w-full bg-blue-600 text-white"
          >
            {loading ? 'Guardando...' : 'Guardar estudio médico'}
          </button>

        </form>

      </div>

    </div>
  )
}