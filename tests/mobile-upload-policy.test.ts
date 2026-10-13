import { expect, it } from 'vitest'
import { uploadSelectionError } from '../src/lib/mobile-upload-policy'
it.each([{ name: 'photo.HEIC', type: '' }, { name: 'photo', type: 'image/heif' }])('HEIC is rejected with an actionable mobile alternative: %j', file => {
  expect(uploadSelectionError({ ...file, size: 200 })).toContain('Tomar una foto')
})
it.each(['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])('standard mobile upload is accepted: %s', type => {
  expect(uploadSelectionError({ name: 'document', type, size: 200 })).toBeNull()
})
it('mobile providers without MIME types can select a supported extension', () => {
  expect(uploadSelectionError({ name: 'document.pdf', type: '', size: 200 })).toBeNull()
})
it('empty and unsupported files show clear errors before upload', () => {
  expect(uploadSelectionError({ name: 'image.jpg', type: 'image/jpeg', size: 0 })).toContain('vacío')
  expect(uploadSelectionError({ name: 'app.exe', type: '', size: 200 })).toContain('PDF')
})
