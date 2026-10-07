import { NextResponse } from 'next/server'
// Discoverable credentials do not require revealing whether an email is registered.
export async function POST(req: Request) {
  const { email } = await req.json()
  return NextResponse.json({ hasPasskey: typeof email === 'string' && email.includes('@') })
}
