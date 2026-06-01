import type { Metadata } from 'next';
import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm';

export const metadata: Metadata = {
  title: 'Lupa Password — TransUm Bandung',
  description: 'Reset password akun TransUm Bandung Anda',
};

export default function ForgotPasswordPage() {
  return (
    <div className="login-page">
      <div className="login-page__grid" />
      <div className="login-page__glow" />
      <ForgotPasswordForm />
    </div>
  );
}
