import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth';

export default async function Home() {
  const cookieStore = await cookies();
  const token = cookieStore.get('transum_session')?.value;

  if (token) {
    const session = await verifySession(token);
    if (session) {
      redirect('/dashboard');
    }
  }

  redirect('/login');
}
