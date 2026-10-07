import { appUrl } from '@/lib/app-url'

export async function sendResetEmail(email: string, token: string) {
  const key = process.env.RESEND_API_KEY
  const from = process.env.RESET_EMAIL_FROM
  if (!key || !from) throw new Error('Reset email provider is not configured')
  const link = `${appUrl()}/reset-password/${token}`
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST', signal: AbortSignal.timeout(10000),
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [email], subject: 'Recuperar acceso a Enlace Salud', text: `Para restablecer su contraseña, abra este enlace en los próximos 15 minutos: ${link}
Si no lo solicitó, ignore este mensaje.` }),
  })
  if (!response.ok) throw new Error('Reset email delivery failed')
}
