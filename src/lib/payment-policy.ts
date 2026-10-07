export const PRO_AMOUNT = 10000
export const PRO_PRODUCT = 'enlace-salud-pro'
export function validProPayment(session: { payment_status: string; mode: string | null; currency: string | null; amount_total: number | null; metadata: Record<string, string> | null }) {
  return session.payment_status === 'paid' && session.mode === 'payment' && session.currency === 'usd' &&
    session.amount_total === PRO_AMOUNT && session.metadata?.product === PRO_PRODUCT && Boolean(session.metadata?.userId)
}
