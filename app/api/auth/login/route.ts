import { NextResponse } from 'next/server';
import { signSession } from '@/lib/auth';

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 5 * 60 * 1000; // 5 menit

// In-memory rate limiter (untuk produksi gunakan Redis/KV)
const loginAttempts: Record<string, { count: number; lockedUntil: number }> = {};

export async function POST(request: Request) {
  const { username, password } = await request.json();

  const ip = request.headers.get('x-forwarded-for') ?? 'unknown';
  const now = Date.now();

  // Rate limiting
  if (!loginAttempts[ip]) loginAttempts[ip] = { count: 0, lockedUntil: 0 };
  const attempt = loginAttempts[ip];

  if (attempt.lockedUntil > now) {
    const remaining = Math.ceil((attempt.lockedUntil - now) / 1000);
    return NextResponse.json(
      { error: `Terlalu banyak percobaan. Coba lagi dalam ${remaining} detik.` },
      { status: 429 }
    );
  }

  const validUser = process.env.AUTH_USERNAME ?? 'admin';
  const validPass = process.env.AUTH_PASSWORD ?? 'transumbandung2026';

  if (username !== validUser || password !== validPass) {
    attempt.count++;
    if (attempt.count >= MAX_ATTEMPTS) {
      attempt.lockedUntil = now + LOCKOUT_DURATION;
    }
    const remaining = MAX_ATTEMPTS - attempt.count;
    return NextResponse.json(
      { error: `Username atau password salah. Sisa percobaan: ${Math.max(0, remaining)}` },
      { status: 401 }
    );
  }

  // Login sukses — buat JWT
  attempt.count = 0;
  attempt.lockedUntil = 0;

  const token = await signSession(username);

  const response = NextResponse.json({ ok: true });
  response.cookies.set('transum_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 8 * 60 * 60, // 8 jam
    path: '/',
  });

  return response;
}
