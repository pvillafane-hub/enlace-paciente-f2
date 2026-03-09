import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  const { email } = await req.json()

  const user = await prisma.user.findUnique({
    where: { email },
  })

  if (!user) {
    return NextResponse.json({ debug: 'user not found', email })
  }

  const authMethods = await prisma.authMethod.findMany({
    where: { userId: user.id },
  })

  return NextResponse.json({
    debug: {
      email,
      userId: user.id,
      authMethodsCount: authMethods.length
    },
    hasPasskey: authMethods.length > 0,
  })
}