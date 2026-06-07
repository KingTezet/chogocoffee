import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const BLOCKED = ['/loyalty', '/menu', '/dashboard', '/pos', '/hr', '/laporan', '/laba-rugi', '/report', '/settings', '/staff', '/karyawan']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isBlocked = BLOCKED.some(
    (r) => pathname === r || pathname.startsWith(r + '/')
  )

  if (isBlocked) {
    return NextResponse.redirect(new URL('/suspended', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next|favicon.ico).*)'],
}