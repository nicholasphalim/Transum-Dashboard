import { SignJWT, jwtVerify } from 'jose';
import type { SessionPayload } from '@/types';

const getSecret = () => {
  return new TextEncoder().encode(process.env.SESSION_SECRET ?? 'transum_secret_dev');
};

export async function signSession(username: string): Promise<string> {
  return new SignJWT({ user: username })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(getSecret());
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}
