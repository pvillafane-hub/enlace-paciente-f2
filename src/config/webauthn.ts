import { appUrl } from '@/lib/app-url'
export function webauthnConfig() {
  const origin = appUrl()
  return { origin, rpID: new URL(origin).hostname, rpName: 'Enlace Salud' }
}
