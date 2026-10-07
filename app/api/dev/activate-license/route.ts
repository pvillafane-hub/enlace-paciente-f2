import { NextResponse } from 'next/server'

// Licensing is activated exclusively by the verified payment flow.
export async function GET() {
  return NextResponse.json({ error: 'Not found' }, { status: 404 })
}
