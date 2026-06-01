'use client';

import { useState, type FormEvent, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Token reset password tidak ditemukan atau tidak valid.');
    }
  }, [token]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('Token tidak valid');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('Password tidak cocok');
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Gagal mereset password');
        setShake(true);
        setTimeout(() => setShake(false), 500);
      } else {
        router.push('/login?reset=success');
      }
    } catch {
      setError('Terjadi kesalahan jaringan');
      setShake(true);
      setTimeout(() => setShake(false), 500);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      className={`login-form ${shake ? 'login-form--shake' : ''}`}
      onSubmit={handleSubmit}
    >
      <div className="login-form__header">
        <span className="login-form__icon">🔑</span>
        <h1 className="login-form__title">Password Baru</h1>
        <p className="login-form__subtitle">Silakan atur password baru Anda</p>
      </div>

      {error && (
        <div className="login-form__error">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
            <path d="M8 4.5v4M8 10.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          {error}
        </div>
      )}

      <div className="login-form__field">
        <label htmlFor="password">Password Baru</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Minimal 8 karakter"
          required
          autoComplete="new-password"
          disabled={loading || !token}
          minLength={8}
        />
      </div>

      <div className="login-form__field">
        <label htmlFor="confirmPassword">Konfirmasi Password Baru</label>
        <input
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={e => setConfirmPassword(e.target.value)}
          placeholder="Ketik ulang password baru"
          required
          autoComplete="new-password"
          disabled={loading || !token}
          minLength={8}
        />
      </div>

      <button
        type="submit"
        className="login-form__submit"
        disabled={loading || !token}
      >
        {loading ? (
          <span className="login-form__spinner" />
        ) : (
          'Simpan Password Baru'
        )}
      </button>

      <div className="login-form__links" style={{ textAlign: 'center', marginTop: '16px', fontSize: '13px' }}>
        <a href="/login" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>
          Kembali ke <span style={{ color: 'var(--accent-green)', fontWeight: '600' }}>Halaman Login</span>
        </a>
      </div>
    </form>
  );
}
