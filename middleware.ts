import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rute yang dilindungi
  const protectedPaths = ['/dashboard', '/api/mqtt-config', '/api/data'];
  const isProtected = protectedPaths.some(p => pathname.startsWith(p));

  if (!isProtected) return NextResponse.next();

  const token = request.cookies.get('transum_session')?.value;

  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    const secret = new TextEncoder().encode(process.env.SESSION_SECRET ?? 'transum_secret_dev');
    await jwtVerify(token, secret);
    return NextResponse.next();
  } catch {
    const response = pathname.startsWith('/api/')
      ? NextResponse.json({ error: 'Session expired' }, { status: 401 })
      : NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('transum_session');
    return response;
  }
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/mqtt-config', '/api/data/:path*'],
};
