import type { Metadata } from 'next';
import RegisterForm from '@/components/auth/RegisterForm';

export const metadata: Metadata = {
  title: 'Daftar Akun — TransUm Bandung',
  description: 'Daftar akun baru untuk mengakses dashboard monitoring penumpang',
};

export default function RegisterPage() {
  return (
    <div className="login-page">
      <div className="login-page__grid" />
      <div className="login-page__glow" />
      <RegisterForm />
    </div>
  );
}
