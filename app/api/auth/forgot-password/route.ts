import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getUserByEmail, updateUserResetToken } from '@/lib/db';
import { sendResetEmail } from '@/lib/mail';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const user = await getUserByEmail(email);
    if (!user) {
      // Return success even if not found to prevent email enumeration
      return NextResponse.json({ ok: true });
    }

    // Generate secure random token
    const token = crypto.randomBytes(32).toString('hex');
    const expiry = Date.now() + 3600000; // 1 hour

    await updateUserResetToken(user.id, token, expiry);

    // Send the actual email
    try {
      await sendResetEmail(user.email, token);
    } catch (mailErr) {
      console.error('[API /auth/forgot-password] Mail Error:', mailErr);
      return NextResponse.json({ error: 'Gagal mengirim email. Pastikan SMTP terkonfigurasi dengan benar.' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('[API /auth/forgot-password] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
