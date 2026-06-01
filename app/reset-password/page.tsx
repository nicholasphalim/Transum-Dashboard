import type { Metadata } from 'next';
import { Suspense } from 'react';
import ResetPasswordForm from '@/components/auth/ResetPasswordForm';

export const metadata: Metadata = {
  title: 'Reset Password — TransUm Bandung',
  description: 'Atur ulang password akun Anda',
};

export default function ResetPasswordPage() {
  return (
    <div className="login-page">
      <div className="login-page__grid" />
      <div className="login-page__glow" />
      <Suspense fallback={
        <div className="login-form" style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
          <span className="login-form__spinner" style={{ width: '24px', height: '24px' }} />
        </div>
      }>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
