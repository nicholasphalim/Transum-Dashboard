import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getUserByResetToken, updateUserPassword } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json({ error: 'Token and new password are required' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters long' }, { status: 400 });
    }

    const user = await getUserByResetToken(token);

    if (!user || !user.reset_token_expiry) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 });
    }

    if (Date.now() > user.reset_token_expiry) {
      return NextResponse.json({ error: 'Token has expired' }, { status: 400 });
    }

    const isSameAsOld = await bcrypt.compare(password, user.password_hash);
    if (isSameAsOld) {
      return NextResponse.json({ error: 'Password baru tidak boleh sama dengan password lama' }, { status: 400 });
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    await updateUserPassword(user.id, hash);

    return NextResponse.json({ ok: true, message: 'Password updated successfully' });
  } catch (error: any) {
    console.error('[API /auth/reset-password] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
