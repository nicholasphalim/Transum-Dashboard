import type { Metadata } from 'next';
import LoginForm from '@/components/auth/LoginForm';

export const metadata: Metadata = {
  title: 'Login — TransUm Bandung',
  description: 'Masuk ke dashboard monitoring penumpang halte TransUm Bandung Koridor 5',
};

export default function LoginPage() {
  return (
    <div className="login-page">
      <div className="login-page__grid" />
      <div className="login-page__glow" />
      <LoginForm />
    </div>
  );
}
