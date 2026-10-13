export const MOBILE_UPLOAD_MAX_BYTES = 4 * 1024 * 1024
export function uploadSelectionError(file: { name: string; type: string; size: number }) {
  if (/\.(heic|heif)$/i.test(file.name) || /image\/hei[cf]/i.test(file.type)) return 'Esta foto está en formato HEIC. Usa «Tomar una foto» o selecciona una copia JPG o un PDF.'
  if (!['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(file.type) && !/\.(pdf|jpe?g|png|webp)$/i.test(file.name)) return 'Selecciona un PDF o una foto JPG, PNG o WebP.'
  if (file.size === 0) return 'El archivo está vacío. Selecciona otro documento.'
  return null
}
