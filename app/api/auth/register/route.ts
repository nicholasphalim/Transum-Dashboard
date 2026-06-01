import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createUser, getUserByUsername, getUserByEmail } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { username, email, password } = await request.json();

    if (!username || !email || !password) {
      return NextResponse.json({ error: 'Username, email, and password are required' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters long' }, { status: 400 });
    }

    const existingUser = await getUserByUsername(username);
    if (existingUser) {
      return NextResponse.json({ error: 'Username is already taken' }, { status: 400 });
    }

    const existingEmail = await getUserByEmail(email);
    if (existingEmail) {
      return NextResponse.json({ error: 'Email is already registered' }, { status: 400 });
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    const userId = await createUser(username, email, hash);
    
    if (!userId) {
      return NextResponse.json({ error: 'Gagal membuat akun' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, message: 'Registration successful' });
  } catch (error: any) {
    console.error('[API /auth/register] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
