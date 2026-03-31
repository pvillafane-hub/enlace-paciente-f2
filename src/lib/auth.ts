import bcrypt from 'bcrypt'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'

const SESSION_COOKIE = 'pp_session'
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000 // 7 días

// 🔐 PASSWORD

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash)
}

// 🔐 CREAR SESIÓN

export async function setSession(userId: string) {

  const session = await prisma.session.create({
    data: {
      userId,
      expiresAt: new Date(Date.now() + SESSION_DURATION),
    },
  })

  const cookieStore = await cookies()

  cookieStore.set(SESSION_COOKIE, session.id, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  })
}


// 🔎 OBTENER SESSION ID DESDE COOKIE

export async function getSessionId(): Promise<string | null> {

  const cookieStore = await cookies()

  return cookieStore.get(SESSION_COOKIE)?.value ?? null
}


// 🔎 VALIDAR SESIÓN (SIN RENOVAR)

export async function getValidSession() {

  const sessionId = await getSessionId()

  if (!sessionId) return null

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
  })

  if (!session) return null

  if (session.expiresAt < new Date()) {
    return null
  }

  return session
}


// 🔄 RENOVAR SESIÓN (SLIDING SESSION)

export async function refreshSession(sessionId: string) {

  await prisma.session.updateMany({
    where: { id: sessionId },
    data: {
      expiresAt: new Date(Date.now() + SESSION_DURATION),
    },
  })

}


// 🔐 VALIDAR + RENOVAR + INVALIDAR SI CAMBIÓ PASSWORD

export async function getValidatedSession() {

  const session = await getValidSession()

  if (!session) return null

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
  })

  if (!user) return null

  // 🔐 INVALIDAR SESIONES SI EL PASSWORD CAMBIÓ
  if (user.passwordChangedAt && session.createdAt < user.passwordChangedAt) {
    return null
  }

  // 🔄 Sliding renewal
  await refreshSession(session.id)

  return session
}


// 🚪 LOGOUT REAL

export async function clearSession() {

  const sessionId = await getSessionId()

  if (sessionId) {

    await prisma.session.deleteMany({
      where: { id: sessionId },
    })

  }

  const cookieStore = await cookies()

  cookieStore.delete(SESSION_COOKIE)

}