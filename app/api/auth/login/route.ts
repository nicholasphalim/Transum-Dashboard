import { NextResponse } from 'next/server';
import { signSession } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import { getUserByUsername, getUserByEmail } from '@/lib/db';

export async function POST(request: Request) {
  const { username, password } = await request.json();

  // Allow admin fallback for safety or dev
  const validAdminUser = process.env.AUTH_USERNAME ?? 'admin';
  const validAdminPass = process.env.AUTH_PASSWORD ?? 'transumbandung2026';

  let isValid = false;
  let loggedInUser = null;

  if (username === validAdminUser) {
    if (password === validAdminPass) {
      isValid = true;
    } else {
      return NextResponse.json(
        { error: 'Password salah' },
        { status: 401 }
      );
    }
  } else {
    // Cari berdasarkan username, jika tidak ketemu cari berdasarkan email
    let user = await getUserByUsername(username);
    if (!user && username.includes('@')) {
      user = await getUserByEmail(username);
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Username atau Email belum terdaftar' },
        { status: 401 }
      );
    }
    
    isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Password salah' },
        { status: 401 }
      );
    }
    loggedInUser = user;
  }

  // Login sukses — buat JWT
  const sessionUsername = loggedInUser ? loggedInUser.username : username;
  const token = await signSession(sessionUsername);

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
