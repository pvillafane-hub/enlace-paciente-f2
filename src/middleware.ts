import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const session = request.cookies.get('pp_session')?.value
  const { pathname } = request.nextUrl

  const protectedPaths = ['/upload', '/view', '/dashboard']

  const isProtected = protectedPaths.some(path =>
    pathname.startsWith(path)
  )

  if (isProtected && !session) {
    const loginUrl = new URL('/', request.url)
    loginUrl.searchParams.set('auth', 'required')
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/upload/:path*', '/view/:path*', '/dashboard/:path*'],
}