'use client';

import { useState, type FormEvent } from 'react';

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Terjadi kesalahan');
        setShake(true);
        setTimeout(() => setShake(false), 500);
      } else {
        setSuccess(true);
      }
    } catch {
      setError('Terjadi kesalahan jaringan');
      setShake(true);
      setTimeout(() => setShake(false), 500);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="login-form">
        <div className="login-form__header">
          <span className="login-form__icon">📩</span>
          <h1 className="login-form__title">Email Terkirim!</h1>
          <p className="login-form__subtitle">
            Instruksi reset password telah dikirim ke email Anda.
          </p>
        </div>

        <p style={{ textAlign: 'center', marginTop: '20px', color: 'var(--text-muted)' }}>
          Silakan cek kotak masuk (atau folder spam) di email <strong>{email}</strong> Anda.
        </p>

        <div className="login-form__links" style={{ textAlign: 'center', marginTop: '24px', fontSize: '13px' }}>
          <a href="/login" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>
            Kembali ke <span style={{ color: 'var(--accent-green)', fontWeight: '600' }}>Halaman Login</span>
          </a>
        </div>
      </div>
    );
  }

  return (
    <form
      className={`login-form ${shake ? 'login-form--shake' : ''}`}
      onSubmit={handleSubmit}
    >
      <div className="login-form__header">
        <span className="login-form__icon">🔐</span>
        <h1 className="login-form__title">Lupa Password</h1>
        <p className="login-form__subtitle">Masukkan email yang terdaftar</p>
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
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="Masukkan email Anda"
          required
          autoComplete="email"
          disabled={loading}
        />
      </div>

      <button
        type="submit"
        className="login-form__submit"
        disabled={loading}
      >
        {loading ? (
          <span className="login-form__spinner" />
        ) : (
          'Kirim Link Reset'
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
