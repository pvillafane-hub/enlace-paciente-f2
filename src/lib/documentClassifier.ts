export function detectDocumentType(text: string): string {

  const t = text.toLowerCase()

  // LABORATORIOS
  const labKeywords = [
    "hemoglobin",
    "glucose",
    "cholesterol",
    "platelet",
    "triglyceride",
    "hdl",
    "ldl",
    "blood",
    "lab results",
    "laboratory",
    "reference range",
    "cbc",
    "hematology",
    "chemistry",
    "result value",
    "normal range"
  ]

  // RADIOLOGIA
  const imagingKeywords = [
    "radiology",
    "x-ray",
    "xray",
    "mri",
    "ct scan",
    "ultrasound",
    "impression",
    "findings",
    "radiograph",
    "scan result",
    "imaging"
  ]

  // RECETAS
  const prescriptionKeywords = [
    "rx",
    "prescription",
    "medication",
    "dosage",
    "take once daily",
    "take twice daily",
    "tablet",
    "capsule",
    "mg",
    "pharmacy",
    "refill"
  ]

  if (labKeywords.some(k => t.includes(k))) {
    return "Laboratorio"
  }

  if (imagingKeywords.some(k => t.includes(k))) {
    return "Radiografia"
  }

  if (prescriptionKeywords.some(k => t.includes(k))) {
    return "Receta"
  }

  return "Otro"
}